import httpx
from fastapi.testclient import TestClient
from app.main import app


def test_app_state_has_shared_http_client_during_lifespan():
    # Arrange & Act
    with TestClient(app) as client:
        response = client.get("/health")

        # Assert
        assert response.status_code == 200
        assert isinstance(app.state.http_client, httpx.AsyncClient)
