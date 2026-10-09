from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.schemas.analytics import AnalyticsSummary, PageViewCreate
from app.services import analytics as analytics_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.post("/pageview", status_code=204)
async def create_pageview(payload: PageViewCreate, db: Session = Depends(get_db)) -> None:
    analytics_service.record_pageview(db, payload.path, payload.referrer)


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(
    key: str = Query(..., description="Shared secret gating this dashboard"),
    db: Session = Depends(get_db),
):
    # Fail closed: an unset secret or a mismatched key both return 404 rather
    # than 401/403, so the endpoint's existence isn't revealed to probing.
    if not settings.analytics_secret or key != settings.analytics_secret:
        raise HTTPException(status_code=404)
    return analytics_service.get_summary(db)
