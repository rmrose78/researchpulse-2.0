from app.config import Settings


def test_frontend_url_defaults_to_localhost(monkeypatch):
    # Arrange
    monkeypatch.delenv("FRONTEND_URL", raising=False)

    # Act
    settings = Settings(_env_file=None)

    # Assert
    assert settings.frontend_url == "http://localhost:5173"


def test_frontend_url_reads_from_env_var(monkeypatch):
    # Arrange
    monkeypatch.setenv("FRONTEND_URL", "https://my-app.netlify.app")

    # Act
    settings = Settings(_env_file=None)

    # Assert
    assert settings.frontend_url == "https://my-app.netlify.app"
