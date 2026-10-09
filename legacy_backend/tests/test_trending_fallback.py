from datetime import date
from unittest.mock import AsyncMock, patch
import pytest
from app.schemas.pubmed import ArticleSearchResult, SearchResponse
from app.services import trending as trending_service


def _make_articles(n: int, prefix: str) -> list[ArticleSearchResult]:
    return [
        ArticleSearchResult(
            pmid=f"{prefix}{i}", title=f"Article {prefix}{i}", abstract=None, authors=[],
            journal=None, pub_date="2024/Jan", doi=None,
        )
        for i in range(n)
    ]


class TestWindowSlices:
    def test_short_window_stays_a_single_slice(self):
        # Arrange & Act
        slices = trending_service.window_slices(date(2026, 7, 1), 60)

        # Assert
        assert slices == [("2026/05/02", "2026/07/01")]

    def test_one_year_window_splits_into_four_slices(self):
        # Arrange & Act
        slices = trending_service.window_slices(date(2026, 7, 1), 365)

        # Assert
        assert len(slices) == 4

    def test_slices_are_contiguous_and_cover_the_full_window(self):
        # Arrange & Act — slices are ordered newest-first
        slices = trending_service.window_slices(date(2026, 7, 1), 365)

        # Assert — the newer slice's date_from is exactly the older slice's date_to
        for (newer_from, _), (_, older_to) in zip(slices, slices[1:]):
            assert newer_from == older_to

    def test_two_year_window_splits_into_more_slices_than_one_year(self):
        # Arrange & Act
        one_year = trending_service.window_slices(date(2026, 7, 1), 365)
        two_year = trending_service.window_slices(date(2026, 7, 1), 730)

        # Assert
        assert len(two_year) > len(one_year)


class TestRankForWindowSampling:
    @pytest.mark.asyncio
    async def test_samples_from_every_slice_not_just_the_newest(self):
        # Arrange — a distinct set of pmids per slice, so we can tell which
        # slices actually got queried
        call_log = []

        async def fake_search(query, max_results, date_from, date_to, client):
            call_log.append((date_from, date_to))
            return SearchResponse(
                total=1, results=_make_articles(1, prefix=f"s{len(call_log)}-"), query=query
            )

        async def fake_citation_counts(client, pmids):
            return {pmid: 3 for pmid in pmids}

        with patch.object(trending_service.pubmed_service, "search", side_effect=fake_search), \
             patch.object(
                 trending_service.semantic_scholar_service,
                 "get_citation_counts",
                 side_effect=fake_citation_counts,
             ):
            # Act
            ranked = await trending_service._rank_for_window(
                "cardiology mesh query", AsyncMock(), date(2026, 7, 1), 365
            )

        # Assert — 4 slices for a 1-year window, one PubMed call each,
        # contributing one article each to the combined pool
        assert len(call_log) == 4
        assert len(ranked) == 4

    @pytest.mark.asyncio
    async def test_combines_all_slices_into_one_semantic_scholar_call(self):
        # Arrange
        async def fake_search(query, max_results, date_from, date_to, client):
            return SearchResponse(total=1, results=_make_articles(2, prefix=f"{date_from}-"), query=query)

        citation_call_count = 0

        async def fake_citation_counts(client, pmids):
            nonlocal citation_call_count
            citation_call_count += 1
            return {pmid: 1 for pmid in pmids}

        with patch.object(trending_service.pubmed_service, "search", side_effect=fake_search), \
             patch.object(
                 trending_service.semantic_scholar_service,
                 "get_citation_counts",
                 side_effect=fake_citation_counts,
             ):
            # Act
            await trending_service._rank_for_window(
                "mesh query", AsyncMock(), date(2026, 7, 1), 365
            )

        # Assert — exactly one combined batch call regardless of slice count
        assert citation_call_count == 1

    @pytest.mark.asyncio
    async def test_single_slice_window_uses_full_pool_size(self):
        # Arrange
        captured_max_results = []

        async def fake_search(query, max_results, date_from, date_to, client):
            captured_max_results.append(max_results)
            return SearchResponse(total=0, results=[], query=query)

        with patch.object(trending_service.pubmed_service, "search", side_effect=fake_search), \
             patch.object(
                 trending_service.semantic_scholar_service,
                 "get_citation_counts",
                 new=AsyncMock(return_value={}),
             ):
            # Act
            await trending_service._rank_for_window(
                "mesh query", AsyncMock(), date(2026, 7, 1), 60
            )

        # Assert — a 60-day window is a single slice, so it gets the entire pool budget
        assert captured_max_results == [trending_service.POOL_SIZE]

    @pytest.mark.asyncio
    async def test_deduplicates_pmids_seen_in_more_than_one_slice(self):
        # Arrange — every slice happens to return the same pmid
        async def fake_search(query, max_results, date_from, date_to, client):
            return SearchResponse(
                total=1,
                results=[ArticleSearchResult(
                    pmid="dupe", title="t", abstract=None, authors=[], journal=None,
                    pub_date="2024/Jan", doi=None,
                )],
                query=query,
            )

        async def fake_citation_counts(client, pmids):
            return {pmid: 1 for pmid in pmids}

        with patch.object(trending_service.pubmed_service, "search", side_effect=fake_search), \
             patch.object(
                 trending_service.semantic_scholar_service,
                 "get_citation_counts",
                 side_effect=fake_citation_counts,
             ):
            # Act
            ranked = await trending_service._rank_for_window(
                "mesh query", AsyncMock(), date(2026, 7, 1), 365
            )

        # Assert
        assert len(ranked) == 1


class TestRankForWindowNewNotableSampling:
    @pytest.mark.asyncio
    async def test_makes_a_single_query_not_sliced(self):
        # Arrange
        call_log = []

        async def fake_search(query, max_results, date_from, date_to, client):
            call_log.append((date_from, date_to, max_results))
            return SearchResponse(total=0, results=[], query=query)

        with patch.object(trending_service.pubmed_service, "search", side_effect=fake_search), \
             patch.object(
                 trending_service.semantic_scholar_service,
                 "get_citation_counts",
                 new=AsyncMock(return_value={}),
             ):
            # Act — a 2-year window would be split into ~8 slices for the
            # other modes; New & Notable must still make exactly one call
            await trending_service._rank_for_window(
                "mesh query", AsyncMock(), date(2026, 7, 1), 730, mode="new_notable"
            )

        # Assert
        assert len(call_log) == 1

    @pytest.mark.asyncio
    async def test_always_requests_full_pool_size_regardless_of_window(self):
        # Arrange
        captured_max_results = []

        async def fake_search(query, max_results, date_from, date_to, client):
            captured_max_results.append(max_results)
            return SearchResponse(total=0, results=[], query=query)

        with patch.object(trending_service.pubmed_service, "search", side_effect=fake_search), \
             patch.object(
                 trending_service.semantic_scholar_service,
                 "get_citation_counts",
                 new=AsyncMock(return_value={}),
             ):
            # Act — a 60-day and a 730-day window should request the same budget
            await trending_service._rank_for_window(
                "mesh query", AsyncMock(), date(2026, 7, 1), 60, mode="new_notable"
            )
            await trending_service._rank_for_window(
                "mesh query", AsyncMock(), date(2026, 7, 1), 730, mode="new_notable"
            )

        # Assert — proves the dilution bug is fixed: wider windows no
        # longer shrink the newest-candidate budget
        assert captured_max_results == [trending_service.POOL_SIZE, trending_service.POOL_SIZE]

    @pytest.mark.asyncio
    async def test_queries_the_full_selected_window_as_date_bounds(self):
        # Arrange
        captured_dates = []

        async def fake_search(query, max_results, date_from, date_to, client):
            captured_dates.append((date_from, date_to))
            return SearchResponse(total=0, results=[], query=query)

        with patch.object(trending_service.pubmed_service, "search", side_effect=fake_search), \
             patch.object(
                 trending_service.semantic_scholar_service,
                 "get_citation_counts",
                 new=AsyncMock(return_value={}),
             ):
            # Act
            await trending_service._rank_for_window(
                "mesh query", AsyncMock(), date(2026, 7, 1), 180, mode="new_notable"
            )

        # Assert
        assert captured_dates == [("2026/01/02", "2026/07/01")]
