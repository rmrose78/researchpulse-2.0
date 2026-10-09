from datetime import date
from app.schemas.pubmed import ArticleSearchResult
from app.services.specialties import SPECIALTY_KEYWORDS, SPECIALTY_QUERIES
from app.services.trending import _build_query, _notability, age_days, compute_velocity, rank_articles


def test_age_days_computes_days_since_publication():
    # Arrange
    today = date(2024, 7, 1)

    # Act
    result = age_days("2024/Jan", today)

    # Assert — Jan 1 2024 -> Jul 1 2024 is 182 days
    assert result == 182


def test_age_days_handles_full_month_names():
    # Arrange
    today = date(2024, 7, 1)

    # Act
    result = age_days("2024/January", today)

    # Assert
    assert result == 182


def test_age_days_returns_none_for_missing_pub_date():
    # Arrange & Act
    result = age_days(None, date(2024, 7, 1))

    # Assert
    assert result is None


def test_age_days_returns_none_for_unparseable_pub_date():
    # Arrange & Act
    result = age_days("not a date", date(2024, 7, 1))

    # Assert
    assert result is None


def test_compute_velocity_uses_age_plus_twenty_one_day_smoothing():
    # Arrange & Act
    result = compute_velocity(citation_count=42, age_in_days=21)

    # Assert — 42 / (21 + 21) == 1.0
    assert result == 1.0


def test_compute_velocity_not_raw_citations_over_age():
    # Arrange & Act
    smoothed = compute_velocity(citation_count=10, age_in_days=0)

    # Assert — raw citations/age would divide by zero; smoothing prevents that
    assert smoothed == 10 / 21


def _article(
    pmid: str, pub_date: str | None, publication_types: list[str] | None = None
) -> ArticleSearchResult:
    return ArticleSearchResult(
        pmid=pmid, title=f"Article {pmid}", abstract=None, authors=[],
        journal=None, pub_date=pub_date, doi=None,
        publication_types=publication_types or [],
    )


def test_rank_articles_excludes_zero_citation_articles():
    # Arrange
    articles = [_article("1", "2024/Jan"), _article("2", "2024/Jan")]
    citation_counts = {"1": 0, "2": 5}
    today = date(2024, 7, 1)

    # Act
    ranked = rank_articles(articles, citation_counts, today)

    # Assert
    assert [a.pmid for a in ranked] == ["2"]


def test_rank_articles_excludes_articles_missing_from_citation_counts():
    # Arrange
    articles = [_article("1", "2024/Jan")]
    today = date(2024, 7, 1)

    # Act
    ranked = rank_articles(articles, {}, today)

    # Assert
    assert ranked == []


def test_rank_articles_excludes_unparseable_pub_dates():
    # Arrange
    articles = [_article("1", None)]
    citation_counts = {"1": 5}
    today = date(2024, 7, 1)

    # Act
    ranked = rank_articles(articles, citation_counts, today)

    # Assert
    assert ranked == []


def test_rank_articles_sorts_by_velocity_descending():
    # Arrange — same age, different citation counts -> different velocity
    articles = [_article("low", "2024/Jan"), _article("high", "2024/Jan")]
    citation_counts = {"low": 1, "high": 100}
    today = date(2024, 7, 1)

    # Act
    ranked = rank_articles(articles, citation_counts, today)

    # Assert
    assert [a.pmid for a in ranked] == ["high", "low"]


def test_rank_articles_includes_citation_stat_fields():
    # Arrange
    articles = [_article("1", "2024/Jan")]
    citation_counts = {"1": 28}
    today = date(2024, 7, 15)  # 196 days after Jan 1

    # Act
    ranked = rank_articles(articles, citation_counts, today)

    # Assert
    assert ranked[0].citation_count == 28
    assert ranked[0].velocity == 28 / (196 + 21)


def test_rank_articles_includes_age_days_field():
    # Arrange
    articles = [_article("1", "2024/Jan")]
    citation_counts = {"1": 5}
    today = date(2024, 7, 15)  # 196 days after Jan 1

    # Act
    ranked = rank_articles(articles, citation_counts, today)

    # Assert
    assert ranked[0].age_days == 196


def test_rank_articles_trending_mode_still_excludes_zero_citation_articles():
    # Arrange — explicit "trending" mode behaves the same as the default
    articles = [_article("1", "2024/Jan"), _article("2", "2024/Jan")]
    citation_counts = {"1": 0, "2": 5}
    today = date(2024, 7, 1)

    # Act
    ranked = rank_articles(articles, citation_counts, today, mode="trending")

    # Assert
    assert [a.pmid for a in ranked] == ["2"]


def test_rank_articles_most_cited_sorts_by_raw_citation_count():
    # Arrange — velocity would rank these the other way around (the fresher
    # article has fewer citations but a much higher velocity)
    articles = [_article("newer_fewer_citations", "2024/Jun"), _article("older_more_citations", "2023/Jan")]
    citation_counts = {"newer_fewer_citations": 5, "older_more_citations": 50}
    today = date(2024, 7, 1)

    # Act
    ranked = rank_articles(articles, citation_counts, today, mode="most_cited")

    # Assert
    assert [a.pmid for a in ranked] == ["older_more_citations", "newer_fewer_citations"]


def test_rank_articles_new_notable_includes_zero_citation_articles():
    # Arrange — "brand_new" is entirely absent from citation_counts, as a
    # just-published article with no Semantic Scholar record yet would be
    citation_counts = {"has_citations": 3}
    articles = [_article("has_citations", "2024/Jun"), _article("brand_new", "2024/Jun")]
    today = date(2024, 7, 1)

    # Act
    ranked = rank_articles(articles, citation_counts, today, mode="new_notable")

    # Assert
    assert {a.pmid for a in ranked} == {"has_citations", "brand_new"}
    brand_new = next(a for a in ranked if a.pmid == "brand_new")
    assert brand_new.citation_count == 0


def test_rank_articles_new_notable_sorts_by_recency_not_citation_count():
    # Arrange — the older article has a far higher citation count
    articles = [_article("older", "2024/Jan"), _article("newer", "2024/Jun")]
    citation_counts = {"older": 100, "newer": 1}
    today = date(2024, 7, 1)

    # Act
    ranked = rank_articles(articles, citation_counts, today, mode="new_notable")

    # Assert — newest publication first, regardless of citation count
    assert [a.pmid for a in ranked] == ["newer", "older"]


def test_notability_returns_none_when_no_publication_types_match():
    # Arrange & Act
    result = _notability(["Journal Article", "Case Reports"])

    # Assert
    assert result is None


def test_notability_returns_best_tier_match_across_multiple_types():
    # Arrange & Act — Multicenter Study (tier 3) and RCT (tier 2) both present
    result = _notability(["Multicenter Study", "Randomized Controlled Trial"])

    # Assert — best (lowest-number) tier wins, not first-in-list
    assert result == (2, "Randomized Controlled Trial")


def test_notability_ranks_meta_analysis_above_rct():
    # Arrange & Act
    result = _notability(["Randomized Controlled Trial", "Meta-Analysis"])

    # Assert
    assert result == (1, "Meta-Analysis")


def test_rank_articles_new_notable_sets_notable_type_on_tiered_article():
    # Arrange
    articles = [_article("rct", "2024/Jun", publication_types=["Randomized Controlled Trial"])]
    citation_counts = {"rct": 0}
    today = date(2024, 7, 1)

    # Act
    ranked = rank_articles(articles, citation_counts, today, mode="new_notable")

    # Assert
    assert ranked[0].notable_type == "Randomized Controlled Trial"


def test_rank_articles_new_notable_leaves_notable_type_none_for_untiered_article():
    # Arrange
    articles = [_article("plain", "2024/Jun", publication_types=["Journal Article"])]
    citation_counts = {"plain": 0}
    today = date(2024, 7, 1)

    # Act
    ranked = rank_articles(articles, citation_counts, today, mode="new_notable")

    # Assert
    assert ranked[0].notable_type is None


def test_rank_articles_new_notable_sorts_tiered_article_above_newer_untiered_one():
    # Arrange — "plain" is newer, but "rct" has an evidence tier
    articles = [
        _article("plain", "2024/Jun"),
        _article("rct", "2024/Jan", publication_types=["Randomized Controlled Trial"]),
    ]
    citation_counts = {"plain": 0, "rct": 0}
    today = date(2024, 7, 1)

    # Act
    ranked = rank_articles(articles, citation_counts, today, mode="new_notable")

    # Assert — tier beats recency
    assert [a.pmid for a in ranked] == ["rct", "plain"]


def test_rank_articles_new_notable_sorts_meta_analysis_above_rct_regardless_of_date():
    # Arrange — "rct" is newer than "meta"
    articles = [
        _article("rct", "2024/Jun", publication_types=["Randomized Controlled Trial"]),
        _article("meta", "2024/Jan", publication_types=["Meta-Analysis"]),
    ]
    citation_counts = {"rct": 0, "meta": 0}
    today = date(2024, 7, 1)

    # Act
    ranked = rank_articles(articles, citation_counts, today, mode="new_notable")

    # Assert — better tier wins even though it's the older article
    assert [a.pmid for a in ranked] == ["meta", "rct"]


def test_rank_articles_new_notable_recency_breaks_ties_among_untiered_articles():
    # Arrange — neither article has a qualifying publication type
    articles = [_article("older", "2024/Jan"), _article("newer", "2024/Jun")]
    citation_counts = {"older": 0, "newer": 0}
    today = date(2024, 7, 1)

    # Act
    ranked = rank_articles(articles, citation_counts, today, mode="new_notable")

    # Assert — falls back to today's pure-recency order, no regression
    assert [a.pmid for a in ranked] == ["newer", "older"]


def test_rank_articles_trending_mode_notable_type_always_none():
    # Arrange — even a tiered article gets no notable_type outside new_notable
    articles = [_article("1", "2024/Jan", publication_types=["Meta-Analysis"])]
    citation_counts = {"1": 5}
    today = date(2024, 7, 1)

    # Act
    ranked = rank_articles(articles, citation_counts, today, mode="trending")

    # Assert
    assert ranked[0].notable_type is None


def test_rank_articles_most_cited_mode_notable_type_always_none():
    # Arrange
    articles = [_article("1", "2024/Jan", publication_types=["Meta-Analysis"])]
    citation_counts = {"1": 5}
    today = date(2024, 7, 1)

    # Act
    ranked = rank_articles(articles, citation_counts, today, mode="most_cited")

    # Assert
    assert ranked[0].notable_type is None


def test_build_query_returns_mesh_only_for_trending_mode():
    # Arrange & Act
    query = _build_query("cardiology", "trending")

    # Assert
    assert query == SPECIALTY_QUERIES["cardiology"]


def test_build_query_returns_mesh_only_for_most_cited_mode():
    # Arrange & Act
    query = _build_query("cardiology", "most_cited")

    # Assert
    assert query == SPECIALTY_QUERIES["cardiology"]


def test_build_query_returns_hybrid_mesh_or_keyword_query_for_new_notable_mode():
    # Arrange & Act
    query = _build_query("cardiology", "new_notable")

    # Assert — MeSH query preserved, ORed with title/abstract keyword terms
    assert SPECIALTY_QUERIES["cardiology"] in query
    assert " OR " in query
    for keyword in SPECIALTY_KEYWORDS["cardiology"]:
        assert f'"{keyword}"[Title/Abstract]' in query
