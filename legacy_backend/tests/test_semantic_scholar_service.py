import httpx
import pytest
from unittest.mock import AsyncMock
from app.services.semantic_scholar import SemanticScholarService


def _batch_response(payload: list) -> httpx.Response:
    return httpx.Response(
        status_code=200,
        json=payload,
        request=httpx.Request("POST", "https://testserver/graph/v1/paper/batch"),
    )


@pytest.mark.asyncio
async def test_get_citation_counts_returns_empty_dict_for_empty_pmids():
    # Arrange
    service = SemanticScholarService()
    client = AsyncMock()

    # Act
    result = await service.get_citation_counts(client, [])

    # Assert
    assert result == {}
    client.post.assert_not_called()


@pytest.mark.asyncio
async def test_get_citation_counts_maps_pmid_to_citation_count():
    # Arrange
    service = SemanticScholarService()
    client = AsyncMock()
    client.post.return_value = _batch_response([
        {"externalIds": {"PubMed": "111"}, "citationCount": 42},
        {"externalIds": {"PubMed": "222"}, "citationCount": 7},
    ])

    # Act
    result = await service.get_citation_counts(client, ["111", "222"])

    # Assert
    assert result == {"111": 42, "222": 7}


@pytest.mark.asyncio
async def test_get_citation_counts_skips_unmatched_null_entries():
    # Arrange — Semantic Scholar returns a bare null for any id it can't find
    service = SemanticScholarService()
    client = AsyncMock()
    client.post.return_value = _batch_response([
        {"externalIds": {"PubMed": "111"}, "citationCount": 42},
        None,
    ])

    # Act
    result = await service.get_citation_counts(client, ["111", "999"])

    # Assert
    assert result == {"111": 42}


@pytest.mark.asyncio
async def test_get_citation_counts_treats_missing_count_as_zero():
    # Arrange
    service = SemanticScholarService()
    client = AsyncMock()
    client.post.return_value = _batch_response([
        {"externalIds": {"PubMed": "111"}, "citationCount": None},
    ])

    # Act
    result = await service.get_citation_counts(client, ["111"])

    # Assert
    assert result == {"111": 0}


@pytest.mark.asyncio
async def test_get_citation_counts_sends_pmid_prefixed_ids():
    # Arrange
    service = SemanticScholarService()
    client = AsyncMock()
    client.post.return_value = _batch_response([])

    # Act
    await service.get_citation_counts(client, ["111", "222"])

    # Assert
    call_kwargs = client.post.call_args.kwargs
    assert call_kwargs["json"] == {"ids": ["PMID:111", "PMID:222"]}


@pytest.mark.asyncio
async def test_get_citation_counts_matches_real_semantic_scholar_response_shape():
    # Arrange — a real /graph/v1/paper/batch response includes several other
    # externalIds keys (MAG, DOI, PubMedCentral, CorpusId) alongside "PubMed";
    # this guards against silently reading the wrong key (e.g. "PMID", which
    # is the id *prefix* we send, not the key Semantic Scholar returns it under).
    service = SemanticScholarService()
    client = AsyncMock()
    client.post.return_value = _batch_response([
        {
            "paperId": "b47e6e19e7c459210316ee02b830253fe8a6e904",
            "externalIds": {
                "MAG": "3111255098",
                "PubMedCentral": "7745181",
                "DOI": "10.1056/NEJMoa2034577",
                "CorpusId": 228087117,
                "PubMed": "33301246",
            },
            "citationCount": 11239,
        },
    ])

    # Act
    result = await service.get_citation_counts(client, ["33301246"])

    # Assert
    assert result == {"33301246": 11239}


@pytest.mark.asyncio
async def test_get_citation_counts_filters_out_empty_pmids_before_sending():
    # Arrange — a single empty/malformed id makes Semantic Scholar reject the
    # *entire* batch with a 400 ("No valid paper ids given"), so it must never
    # reach the request body.
    service = SemanticScholarService()
    client = AsyncMock()
    client.post.return_value = _batch_response([])

    # Act
    await service.get_citation_counts(client, ["111", "", "222"])

    # Assert
    call_kwargs = client.post.call_args.kwargs
    assert call_kwargs["json"] == {"ids": ["PMID:111", "PMID:222"]}


@pytest.mark.asyncio
async def test_get_citation_counts_returns_empty_dict_when_all_pmids_are_empty():
    # Arrange
    service = SemanticScholarService()
    client = AsyncMock()

    # Act
    result = await service.get_citation_counts(client, ["", ""])

    # Assert
    assert result == {}
    client.post.assert_not_called()


@pytest.mark.asyncio
async def test_get_citation_counts_treats_400_no_valid_ids_as_empty_result():
    # Arrange — Semantic Scholar returns 400 (not 200-with-nulls) when *none*
    # of the batch's ids are in its graph yet, e.g. a pool of articles too
    # recent for its citation index to have ingested.
    service = SemanticScholarService()
    client = AsyncMock()
    client.post.return_value = httpx.Response(
        status_code=400,
        json={"error": "No valid paper ids given"},
        request=httpx.Request("POST", "https://testserver/graph/v1/paper/batch"),
    )

    # Act
    result = await service.get_citation_counts(client, ["111", "222"])

    # Assert
    assert result == {}


@pytest.mark.asyncio
async def test_get_citation_counts_calls_the_batch_endpoint():
    # Arrange
    service = SemanticScholarService()
    client = AsyncMock()
    client.post.return_value = _batch_response([])

    # Act
    await service.get_citation_counts(client, ["111"])

    # Assert
    call_args = client.post.call_args
    assert call_args.args[0].endswith("/graph/v1/paper/batch")
