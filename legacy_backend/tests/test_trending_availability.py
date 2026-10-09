from datetime import datetime, timedelta, timezone
import pytest
from app.database import sessionLocal
from app.models.trending import TrendingSnapshot
from app.services import trending as trending_service

WINDOW_DAYS = 365


def _delete_all():
    db = sessionLocal()
    db.query(TrendingSnapshot).filter(TrendingSnapshot.specialty.like("avail_test_%")).delete()
    db.commit()
    db.close()


@pytest.fixture(autouse=True)
def _clean():
    _delete_all()
    yield
    _delete_all()


def _insert_snapshot(specialty, payload, window_days=WINDOW_DAYS, computed_at=None):
    db = sessionLocal()
    snapshot = TrendingSnapshot(
        specialty=specialty,
        mode="trending",
        window_days=window_days,
        payload=payload,
        **({"computed_at": computed_at} if computed_at else {}),
    )
    db.add(snapshot)
    db.commit()
    db.close()


def test_returns_empty_dict_when_nothing_cached():
    # Arrange
    db = sessionLocal()

    # Act
    result = trending_service.list_cached_availability(db, WINDOW_DAYS)

    # Assert
    assert "avail_test_none" not in result
    db.close()


def test_marks_a_specialty_with_results_as_available():
    # Arrange
    _insert_snapshot("avail_test_a", payload=[{"pmid": "1"}])
    db = sessionLocal()

    # Act
    result = trending_service.list_cached_availability(db, WINDOW_DAYS)

    # Assert
    assert result["avail_test_a"] is True
    db.close()


def test_marks_a_specialty_with_empty_payload_as_unavailable():
    # Arrange
    _insert_snapshot("avail_test_b", payload=[])
    db = sessionLocal()

    # Act
    result = trending_service.list_cached_availability(db, WINDOW_DAYS)

    # Assert
    assert result["avail_test_b"] is False
    db.close()


def test_uses_only_the_most_recent_snapshot_per_specialty():
    # Arrange — an older empty snapshot, then a newer non-empty one
    _insert_snapshot(
        "avail_test_c", payload=[],
        computed_at=datetime.now(timezone.utc) - timedelta(hours=2),
    )
    _insert_snapshot(
        "avail_test_c", payload=[{"pmid": "1"}],
        computed_at=datetime.now(timezone.utc),
    )
    db = sessionLocal()

    # Act
    result = trending_service.list_cached_availability(db, WINDOW_DAYS)

    # Assert
    assert result["avail_test_c"] is True
    db.close()


def test_isolates_by_window_days():
    # Arrange — empty at 60 days, has results at 365 days
    _insert_snapshot("avail_test_d", payload=[], window_days=60)
    _insert_snapshot("avail_test_d", payload=[{"pmid": "1"}], window_days=365)
    db = sessionLocal()

    # Act
    at_60 = trending_service.list_cached_availability(db, 60)
    at_365 = trending_service.list_cached_availability(db, 365)

    # Assert
    assert at_60["avail_test_d"] is False
    assert at_365["avail_test_d"] is True
    db.close()


def test_omits_specialties_with_no_cached_row_at_all():
    # Arrange — nothing inserted for this specialty
    db = sessionLocal()

    # Act
    result = trending_service.list_cached_availability(db, WINDOW_DAYS)

    # Assert
    assert "avail_test_never_computed" not in result
    db.close()
