import logging
import httpx
from app.database import sessionLocal
from app.services.specialties import SPECIALTY_QUERIES
from app.services.trending import VALID_MODES, VALID_WINDOW_DAYS, _compute_and_store

logger = logging.getLogger(__name__)

# Every supported (specialty, mode, window_days) combination. Rank-movement
# badges need two snapshot rows for the same combination to diff against each
# other — without a scheduled prewarm, that second row only ever gets written
# if a live visitor happens to re-request the exact same combination after
# its cache entry goes stale. With this many independent combinations
# splitting real traffic, most of them never get revisited, so they'd sit at
# exactly one snapshot forever and permanently show no badge.
ALL_COMBINATIONS: list[tuple[str, str, int]] = [
    (specialty, mode, window_days)
    for specialty in SPECIALTY_QUERIES
    for mode in sorted(VALID_MODES)
    for window_days in sorted(VALID_WINDOW_DAYS)
]


async def prewarm_all(client: httpx.AsyncClient) -> None:
    """Recomputes a snapshot for every supported combination, regardless of
    staleness or recent traffic. Runs sequentially (not concurrently) to stay
    under PubMed/Semantic Scholar rate limits. A failure on one combination
    is logged and skipped rather than aborting the rest of the batch."""
    for specialty, mode, window_days in ALL_COMBINATIONS:
        db = sessionLocal()
        try:
            await _compute_and_store(db, client, specialty, window_days, mode)
        except Exception:
            logger.exception(
                "Trending prewarm failed for specialty=%s mode=%s window_days=%s",
                specialty, mode, window_days,
            )
        finally:
            db.close()
