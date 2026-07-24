import pytest
from unittest.mock import AsyncMock, patch
from app.database import sessionLocal
from app.models.reading_list import SavedArticle
from app.services import reading_list as reading_list_service


def _delete_saved(pmid: str):
    db = sessionLocal()
    db.query(SavedArticle).filter(SavedArticle.pmid == pmid).delete()
    db.commit()
    db.close()


def _save(pmid: str, title: str):
    db = sessionLocal()
    db.add(SavedArticle(pmid=pmid, title=title))
    db.commit()
    db.close()


@pytest.mark.asyncio
async def test_get_live_citation_counts_returns_counts_for_saved_articles():
    # Arrange
    _delete_saved("70000001")
    _save("70000001", "A saved article")
    client = AsyncMock()
    db = sessionLocal()

    # Act
    with (
        patch.object(
            reading_list_service,
            "list_saved_articles",
            AsyncMock(return_value=[SavedArticle(pmid="70000001", title="A saved article")]),
        ),
        patch.object(
            reading_list_service.semantic_scholar_service,
            "get_citation_counts",
            AsyncMock(return_value={"70000001": 42}),
        ) as mocked,
    ):
        result = await reading_list_service.get_live_citation_counts(db, client)

    # Assert
    assert result == {"70000001": 42}
    mocked.assert_awaited_once_with(client, ["70000001"])
    db.close()
    _delete_saved("70000001")


@pytest.mark.asyncio
async def test_get_live_citation_counts_returns_empty_dict_when_reading_list_is_empty():
    # Arrange
    db = sessionLocal()
    client = AsyncMock()

    # Act
    with (
        patch.object(
            reading_list_service,
            "list_saved_articles",
            AsyncMock(return_value=[]),
        ),
        patch.object(
            reading_list_service.semantic_scholar_service,
            "get_citation_counts",
            AsyncMock(return_value={}),
        ) as mocked,
    ):
        result = await reading_list_service.get_live_citation_counts(db, client)

    # Assert
    assert result == {}
    mocked.assert_awaited_once_with(client, [])
    db.close()
