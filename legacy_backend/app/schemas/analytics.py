from pydantic import BaseModel


class PageViewCreate(BaseModel):
    path: str
    referrer: str | None = None


class PathCount(BaseModel):
    path: str
    count: int


class ReferrerCount(BaseModel):
    referrer: str
    count: int


class BucketSummary(BaseModel):
    total_views: int
    top_paths: list[PathCount]
    top_referrers: list[ReferrerCount]


class AnalyticsSummary(BaseModel):
    today: BucketSummary
    this_week: BucketSummary
    this_month: BucketSummary
    this_year: BucketSummary
    all_time: BucketSummary
