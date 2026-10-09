from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.analytics import PageView
from app.schemas.analytics import AnalyticsSummary, BucketSummary, PathCount, ReferrerCount

DIRECT_REFERRER_LABEL = "Direct"
TOP_N = 5


def record_pageview(db: Session, path: str, referrer: str | None = None) -> PageView:
    view = PageView(path=path, referrer=referrer or None)
    db.add(view)
    db.commit()
    db.refresh(view)
    return view


def _bucket_start(now: datetime, bucket: str) -> datetime | None:
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if bucket == "today":
        return start_of_today
    if bucket == "this_week":
        return start_of_today - timedelta(days=start_of_today.weekday())
    if bucket == "this_month":
        return start_of_today.replace(day=1)
    if bucket == "this_year":
        return start_of_today.replace(month=1, day=1)
    return None  # all_time — no lower bound


def _bucket_summary(db: Session, start: datetime | None) -> BucketSummary:
    base_query = db.query(PageView)
    if start is not None:
        base_query = base_query.filter(PageView.viewed_at >= start)

    total_views = base_query.count()

    path_rows = (
        base_query.with_entities(PageView.path, func.count(PageView.id).label("count"))
        .group_by(PageView.path)
        .order_by(func.count(PageView.id).desc())
        .limit(TOP_N)
        .all()
    )
    top_paths = [PathCount(path=path, count=count) for path, count in path_rows]

    # Blank/missing referrer (direct navigation, not a link click) is grouped
    # under one label rather than showing as an empty string in the summary.
    referrer_expr = func.coalesce(func.nullif(PageView.referrer, ""), DIRECT_REFERRER_LABEL)
    referrer_rows = (
        base_query.with_entities(referrer_expr.label("referrer"), func.count(PageView.id).label("count"))
        .group_by(referrer_expr)
        .order_by(func.count(PageView.id).desc())
        .limit(TOP_N)
        .all()
    )
    top_referrers = [ReferrerCount(referrer=referrer, count=count) for referrer, count in referrer_rows]

    return BucketSummary(total_views=total_views, top_paths=top_paths, top_referrers=top_referrers)


def get_summary(db: Session) -> AnalyticsSummary:
    now = datetime.now(timezone.utc)
    return AnalyticsSummary(
        today=_bucket_summary(db, _bucket_start(now, "today")),
        this_week=_bucket_summary(db, _bucket_start(now, "this_week")),
        this_month=_bucket_summary(db, _bucket_start(now, "this_month")),
        this_year=_bucket_summary(db, _bucket_start(now, "this_year")),
        all_time=_bucket_summary(db, None),
    )
