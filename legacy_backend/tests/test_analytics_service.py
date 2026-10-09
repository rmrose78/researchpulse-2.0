from datetime import datetime, timedelta, timezone
import pytest
from app.database import sessionLocal
from app.models.analytics import PageView
from app.services import analytics as analytics_service


def _delete_pageviews():
    db = sessionLocal()
    db.query(PageView).delete()
    db.commit()
    db.close()


@pytest.fixture(autouse=True)
def _clean_pageviews():
    _delete_pageviews()
    yield
    _delete_pageviews()


def _insert_pageview(path: str, referrer: str | None, viewed_at: datetime) -> None:
    db = sessionLocal()
    db.add(PageView(path=path, referrer=referrer, viewed_at=viewed_at))
    db.commit()
    db.close()


def test_record_pageview_stores_path_and_referrer():
    # Arrange
    db = sessionLocal()

    # Act
    view = analytics_service.record_pageview(db, "/trending", "https://linkedin.com")

    # Assert
    assert view.path == "/trending"
    assert view.referrer == "https://linkedin.com"
    db.close()


def test_record_pageview_stores_none_for_missing_referrer():
    # Arrange
    db = sessionLocal()

    # Act
    view = analytics_service.record_pageview(db, "/trending", None)

    # Assert
    assert view.referrer is None
    db.close()


def test_get_summary_counts_todays_view_in_every_bucket():
    # Arrange
    now = datetime.now(timezone.utc)
    _insert_pageview("/trending", "https://linkedin.com", now)
    db = sessionLocal()

    # Act
    summary = analytics_service.get_summary(db)

    # Assert
    assert summary.today.total_views == 1
    assert summary.this_week.total_views == 1
    assert summary.this_month.total_views == 1
    assert summary.this_year.total_views == 1
    assert summary.all_time.total_views == 1
    db.close()


def test_get_summary_excludes_old_view_from_narrower_buckets():
    # Arrange — 40 days ago is reliably outside today/week/month regardless
    # of when this test runs, without needing to reason about month lengths.
    now = datetime.now(timezone.utc)
    old = now - timedelta(days=40)
    _insert_pageview("/trending", None, old)
    db = sessionLocal()

    # Act
    summary = analytics_service.get_summary(db)

    # Assert
    assert summary.today.total_views == 0
    assert summary.this_week.total_views == 0
    assert summary.this_month.total_views == 0
    assert summary.all_time.total_views == 1
    db.close()


def test_get_summary_excludes_view_from_previous_year():
    # Arrange — one second before this year started, calendar-safe regardless
    # of what day this test runs on.
    now = datetime.now(timezone.utc)
    start_of_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    last_year = start_of_year - timedelta(seconds=1)
    _insert_pageview("/trending", None, last_year)
    db = sessionLocal()

    # Act
    summary = analytics_service.get_summary(db)

    # Assert
    assert summary.this_year.total_views == 0
    assert summary.all_time.total_views == 1
    db.close()


def test_get_summary_ranks_top_paths_by_count_desc():
    # Arrange
    now = datetime.now(timezone.utc)
    _insert_pageview("/trending", None, now)
    _insert_pageview("/trending", None, now)
    _insert_pageview("/search", None, now)
    db = sessionLocal()

    # Act
    summary = analytics_service.get_summary(db)

    # Assert
    assert summary.all_time.top_paths[0].path == "/trending"
    assert summary.all_time.top_paths[0].count == 2
    assert summary.all_time.top_paths[1].path == "/search"
    assert summary.all_time.top_paths[1].count == 1
    db.close()


def test_get_summary_groups_missing_referrer_as_direct():
    # Arrange — None and "" both mean "no referrer" and should merge
    now = datetime.now(timezone.utc)
    _insert_pageview("/trending", None, now)
    _insert_pageview("/trending", "", now)
    db = sessionLocal()

    # Act
    summary = analytics_service.get_summary(db)

    # Assert
    direct = next(r for r in summary.all_time.top_referrers if r.referrer == "Direct")
    assert direct.count == 2
    db.close()
