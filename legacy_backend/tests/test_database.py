from sqlalchemy.exc import OperationalError
import pytest
from app import database


def test_create_tables_with_retry_succeeds_immediately_when_db_is_ready(monkeypatch):
    # Arrange
    calls = []
    monkeypatch.setattr(database.Base.metadata, "create_all", lambda bind: calls.append(bind))
    monkeypatch.setattr(database.time, "sleep", lambda seconds: None)

    # Act
    database.create_tables_with_retry(max_attempts=5, delay_seconds=0)

    # Assert
    assert len(calls) == 1


def test_create_tables_with_retry_retries_until_db_becomes_available(monkeypatch):
    # Arrange
    attempts = {"count": 0}

    def flaky_create_all(bind):
        attempts["count"] += 1
        if attempts["count"] < 3:
            raise OperationalError("stmt", {}, Exception("connection refused"))

    monkeypatch.setattr(database.Base.metadata, "create_all", flaky_create_all)
    monkeypatch.setattr(database.time, "sleep", lambda seconds: None)

    # Act
    database.create_tables_with_retry(max_attempts=5, delay_seconds=0)

    # Assert
    assert attempts["count"] == 3


def test_create_tables_with_retry_raises_after_exhausting_attempts(monkeypatch):
    # Arrange
    def always_fails(bind):
        raise OperationalError("stmt", {}, Exception("connection refused"))

    monkeypatch.setattr(database.Base.metadata, "create_all", always_fails)
    monkeypatch.setattr(database.time, "sleep", lambda seconds: None)

    # Act & Assert
    with pytest.raises(OperationalError):
        database.create_tables_with_retry(max_attempts=3, delay_seconds=0)


def test_initialize_database_does_not_raise_when_retry_succeeds(monkeypatch):
    # Arrange
    monkeypatch.setattr(database, "create_tables_with_retry", lambda **kwargs: None)

    # Act & Assert (no exception means pass)
    database.initialize_database()


def test_initialize_database_does_not_raise_when_retry_exhausts_attempts(monkeypatch):
    # Arrange
    def always_raises(**kwargs):
        raise OperationalError("stmt", {}, Exception("connection refused"))

    monkeypatch.setattr(database, "create_tables_with_retry", always_raises)

    # Act & Assert (no exception means pass — failure is logged, not raised)
    database.initialize_database()
