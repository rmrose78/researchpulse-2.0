from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import sessionLocal
from app.models.analytics import PageView


def _delete_pageviews():
    db = sessionLocal()
    db.query(PageView).delete()
    db.commit()
    db.close()


def test_create_pageview_returns_204_and_persists_row():
    # Arrange
    _delete_pageviews()
    with TestClient(app) as client:
        # Act
        response = client.post(
            "/api/analytics/pageview",
            json={"path": "/trending", "referrer": "https://linkedin.com"},
        )

        # Assert
        assert response.status_code == 204
    db = sessionLocal()
    assert db.query(PageView).filter(PageView.path == "/trending").count() == 1
    db.close()
    _delete_pageviews()


def test_create_pageview_requires_path():
    with TestClient(app) as client:
        response = client.post("/api/analytics/pageview", json={})
        assert response.status_code == 422


def test_get_summary_fails_closed_when_secret_unset(monkeypatch):
    # Arrange
    monkeypatch.setattr(settings, "analytics_secret", "")

    with TestClient(app) as client:
        # Act
        response = client.get("/api/analytics/summary", params={"key": "anything"})

        # Assert
        assert response.status_code == 404


def test_get_summary_fails_closed_on_wrong_key(monkeypatch):
    # Arrange
    monkeypatch.setattr(settings, "analytics_secret", "correct-secret")

    with TestClient(app) as client:
        # Act
        response = client.get("/api/analytics/summary", params={"key": "wrong-secret"})

        # Assert
        assert response.status_code == 404


def test_get_summary_returns_200_with_correct_key(monkeypatch):
    # Arrange
    monkeypatch.setattr(settings, "analytics_secret", "correct-secret")

    with TestClient(app) as client:
        # Act
        response = client.get("/api/analytics/summary", params={"key": "correct-secret"})
        data = response.json()

        # Assert
        assert response.status_code == 200
        assert "today" in data
        assert "all_time" in data


def test_get_summary_requires_key_param(monkeypatch):
    # Arrange
    monkeypatch.setattr(settings, "analytics_secret", "correct-secret")

    with TestClient(app) as client:
        # Act
        response = client.get("/api/analytics/summary")

        # Assert
        assert response.status_code == 422
