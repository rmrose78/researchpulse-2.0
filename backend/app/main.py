import asyncio
import logging
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import search, reading_list, trending, analytics
from app.config import settings
from app.database import initialize_database
from app.services.trending import CACHE_TTL
from app.services.trending_prewarm import prewarm_all
import app.models.reading_list
import app.models.trending
import app.models.analytics

logger = logging.getLogger(__name__)

# Keeps every (specialty, mode, window_days) combination's snapshot history
# refreshing on its own schedule, regardless of whether live traffic happens
# to revisit it — see app/services/trending_prewarm.py for why rank-movement
# badges depend on this.
PREWARM_INTERVAL_SECONDS = CACHE_TTL.total_seconds()


async def _prewarm_loop(client: httpx.AsyncClient) -> None:
    while True:
        try:
            await prewarm_all(client)
        except Exception:
            logger.exception("Trending prewarm loop iteration failed")
        await asyncio.sleep(PREWARM_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Trending's Semantic Scholar batch client (and, where opted in, PubMedService
    # calls) reuse this one connection-pooled client instead of opening a fresh
    # httpx.AsyncClient per request.
    async with httpx.AsyncClient() as client:
        app.state.http_client = client
        prewarm_task = asyncio.create_task(_prewarm_loop(client))
        try:
            yield
        finally:
            prewarm_task.cancel()


app = FastAPI(
    title="ResearchPulse API",
    description="Biomedical research discovery platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],  # Trust requests from our deployed frontend
    allow_credentials=True,
    allow_methods=["*"],                      # Allow GET, POST, PUT, DELETE etc
    allow_headers=["*"],                      # Allow any headers
)

# Auto-create tables on startup
initialize_database()

app.include_router(search.router)
app.include_router(reading_list.router)
app.include_router(trending.router)
app.include_router(analytics.router)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ResearchPulse API"}
