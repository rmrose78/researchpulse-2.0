from fastapi.testclient import TestClient
from app.main import app
from app.models.reading_list import SavedArticle

client = TestClient(app)


def _delete_if_exists(pmid: str):
    client.delete(f"/api/reading-list/{pmid}")


def test_saved_at_default_is_evaluated_per_row_not_at_import_time():
    # Arrange
    column = SavedArticle.__table__.columns["saved_at"]

    # Act
    default_arg = column.default.arg

    # Assert — a callable default is invoked fresh for each insert; a bare
    # datetime instance would be computed once at import time and reused
    # (identically) for every row, making ORDER BY saved_at DESC meaningless.
    assert callable(default_arg)


def test_save_article_returns_201():
    # Arrange
    pmid = "90000001"
    _delete_if_exists(pmid)
    payload = {
        "pmid": pmid,
        "title": "Cardiac Regeneration in Zebrafish",
        "authors": ["Smith J", "Lee K"],
        "journal": "Nature Cardiology",
        "pub_date": "2024-01-15",
        "doi": "10.1000/testdoi",
    }

    # Act
    response = client.post("/api/reading-list/", json=payload)
    data = response.json()

    # Assert
    assert response.status_code == 201
    assert data["pmid"] == pmid

    _delete_if_exists(pmid)


def test_save_article_missing_title_returns_422():
    # Arrange
    payload = {"pmid": "90000002"}

    # Act
    response = client.post("/api/reading-list/", json=payload)

    # Assert
    assert response.status_code == 422


def test_save_duplicate_article_returns_409():
    # Arrange
    pmid = "90000003"
    _delete_if_exists(pmid)
    payload = {"pmid": pmid, "title": "Duplicate Save Test"}
    client.post("/api/reading-list/", json=payload)

    # Act
    response = client.post("/api/reading-list/", json=payload)

    # Assert
    assert response.status_code == 409

    _delete_if_exists(pmid)


def test_save_article_response_has_required_fields():
    # Arrange
    pmid = "90000004"
    _delete_if_exists(pmid)
    payload = {"pmid": pmid, "title": "Required Fields Test", "authors": ["Doe J"]}

    # Act
    response = client.post("/api/reading-list/", json=payload)
    data = response.json()

    # Assert
    assert response.status_code == 201
    assert "id" in data
    assert "pmid" in data
    assert "title" in data
    assert "saved_at" in data

    _delete_if_exists(pmid)


def test_get_saved_articles_returns_list():
    # Arrange
    pmid = "90000005"
    _delete_if_exists(pmid)
    client.post("/api/reading-list/", json={"pmid": pmid, "title": "List Endpoint Test"})

    # Act
    response = client.get("/api/reading-list/")
    data = response.json()

    # Assert
    assert response.status_code == 200
    assert any(article["pmid"] == pmid for article in data)

    _delete_if_exists(pmid)


def test_delete_saved_article_returns_204():
    # Arrange
    pmid = "90000006"
    _delete_if_exists(pmid)
    client.post("/api/reading-list/", json={"pmid": pmid, "title": "Delete Test"})

    # Act
    response = client.delete(f"/api/reading-list/{pmid}")

    # Assert
    assert response.status_code == 204


def test_get_reading_list_citations_returns_counts_for_saved_articles(monkeypatch):
    # Arrange — the citations endpoint reads request.app.state.http_client,
    # which is only populated when the app's lifespan has actually run.
    pmid = "90000007"
    _delete_if_exists(pmid)
    client.post("/api/reading-list/", json={"pmid": pmid, "title": "Citations Endpoint Test"})

    async def fake_get_citation_counts(_client, pmids):
        return {pmid: 99 for pmid in pmids}

    from app.services import reading_list as reading_list_service
    monkeypatch.setattr(
        reading_list_service.semantic_scholar_service, "get_citation_counts", fake_get_citation_counts
    )

    # Act
    with TestClient(app) as lifespan_client:
        response = lifespan_client.get("/api/reading-list/citations")
    data = response.json()

    # Assert
    assert response.status_code == 200
    assert data["citations"][pmid] == 99

    _delete_if_exists(pmid)


def test_delete_nonexistent_article_returns_404():
    # Arrange
    pmid = "00000000"
    _delete_if_exists(pmid)

    # Act
    response = client.delete(f"/api/reading-list/{pmid}")

    # Assert
    assert response.status_code == 404
