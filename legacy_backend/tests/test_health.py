from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    # Arrange
    health_endpoint = "/health"

    # Act
    response = client.get(health_endpoint)

    # Assert
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ResearchPulse API"}