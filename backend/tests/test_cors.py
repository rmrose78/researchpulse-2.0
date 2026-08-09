from app.main import app
from app.config import settings


def test_cors_middleware_reads_allowed_origin_from_settings():
    # Arrange
    cors_middleware = next(
        m for m in app.user_middleware if m.cls.__name__ == "CORSMiddleware"
    )

    # Act
    configured_origins = cors_middleware.kwargs["allow_origins"]

    # Assert
    assert settings.frontend_url in configured_origins
