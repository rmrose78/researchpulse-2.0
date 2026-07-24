from datetime import datetime
from pydantic import BaseModel
from app.schemas.pubmed import ArticleSearchResult


class TrendingArticle(ArticleSearchResult):
    citation_count: int
    velocity: float
    notable_type: str | None = None
    rank_delta: int | None = None
    is_new: bool = False
    age_days: int = 0


class TrendingResponse(BaseModel):
    specialty: str
    mode: str
    window_days: int
    computed_at: datetime
    has_rank_history: bool
    results: list[TrendingArticle]


class TrendingAvailabilityResponse(BaseModel):
    window_days: int
    mode: str
    available: dict[str, bool]
