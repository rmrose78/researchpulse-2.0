from collections import defaultdict
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock
import pytest
from app.database import sessionLocal
from app.models.trending import TrendingSnapshot
from app.services import trending_prewarm
from app.services.specialties import SPECIALTY_QUERIES
from app.services.trending import CACHE_TTL, VALID_MODES, VALID_WINDOW_DAYS, attach_rank_movements


def _delete_all_snapshots():
    db = sessionLocal()
    db.query(TrendingSnapshot).delete()
    db.commit()
    db.close()


@pytest.fixture(autouse=True)
def _clean_snapshots():
    _delete_all_snapshots()
    yield
    _delete_all_snapshots()


def test_all_combinations_covers_every_specialty_mode_window_pair():
    # Arrange
    expected_count = len(SPECIALTY_QUERIES) * len(VALID_MODES) * len(VALID_WINDOW_DAYS)

    # Act
    combos = trending_prewarm.ALL_COMBINATIONS

    # Assert
    assert len(combos) == expected_count
    assert ("cardiology", "trending", 365) in combos
    assert ("oncology", "new_notable", 60) in combos


def _write_snapshot(specialty: str, mode: str, window_days: int, computed_at: datetime):
    db = sessionLocal()
    db.add(
        TrendingSnapshot(
            specialty=specialty, mode=mode, window_days=window_days,
            computed_at=computed_at, payload=[],
        )
    )
    db.commit()
    db.close()


def test_all_combinations_fresh_is_false_when_no_snapshots_exist(monkeypatch):
    # Arrange
    monkeypatch.setattr(trending_prewarm, "ALL_COMBINATIONS", [("cardiology", "trending", 365)])

    # Act
    db = sessionLocal()
    result = trending_prewarm.all_combinations_fresh(db, datetime.now(timezone.utc))
    db.close()

    # Assert
    assert result is False


def test_all_combinations_fresh_is_false_when_one_combination_is_stale(monkeypatch):
    # Arrange — cardiology just refreshed, oncology hasn't been touched in
    # well over a full cache cycle
    monkeypatch.setattr(
        trending_prewarm,
        "ALL_COMBINATIONS",
        [("cardiology", "trending", 365), ("oncology", "trending", 365)],
    )
    now = datetime.now(timezone.utc)
    _write_snapshot("cardiology", "trending", 365, now)
    _write_snapshot("oncology", "trending", 365, now - CACHE_TTL - timedelta(hours=1))

    # Act
    db = sessionLocal()
    result = trending_prewarm.all_combinations_fresh(db, now)
    db.close()

    # Assert
    assert result is False


def test_all_combinations_fresh_is_true_when_every_combination_has_a_fresh_snapshot(monkeypatch):
    # Arrange — this is the "a redeploy just happened moments after the last
    # full sweep completed" scenario that broke rank-movement badges
    monkeypatch.setattr(
        trending_prewarm,
        "ALL_COMBINATIONS",
        [("cardiology", "trending", 365), ("oncology", "trending", 365)],
    )
    now = datetime.now(timezone.utc)
    _write_snapshot("cardiology", "trending", 365, now)
    _write_snapshot("oncology", "trending", 365, now)

    # Act
    db = sessionLocal()
    result = trending_prewarm.all_combinations_fresh(db, now)
    db.close()

    # Assert
    assert result is True


@pytest.mark.asyncio
async def test_prewarm_all_computes_and_stores_a_snapshot_for_every_combination(monkeypatch):
    # Arrange
    mock_compute = AsyncMock()
    monkeypatch.setattr(trending_prewarm, "_compute_and_store", mock_compute)

    # Act
    await trending_prewarm.prewarm_all(AsyncMock())

    # Assert
    assert mock_compute.call_count == len(trending_prewarm.ALL_COMBINATIONS)


@pytest.mark.asyncio
async def test_prewarm_all_continues_after_one_combination_raises(monkeypatch):
    # Arrange — cardiology blows up, every other combination should still run
    call_count = 0

    async def flaky_compute(db, client, specialty, window_days, mode):
        nonlocal call_count
        call_count += 1
        if specialty == "cardiology":
            raise RuntimeError("PubMed is down")

    monkeypatch.setattr(trending_prewarm, "_compute_and_store", flaky_compute)

    # Act
    await trending_prewarm.prewarm_all(AsyncMock())

    # Assert
    assert call_count == len(trending_prewarm.ALL_COMBINATIONS)


@pytest.mark.asyncio
async def test_running_prewarm_twice_produces_a_diffable_pair_of_snapshots(monkeypatch):
    # Arrange — each combination's own first call ranks "1" above "2", its
    # own second call (simulating the next scheduled run) flips them. This is
    # the exact scenario that's broken today: nobody has to visit this
    # specialty/mode/window combo themselves for a badge to eventually show up.
    call_counts: dict[tuple, int] = defaultdict(int)

    async def fake_fetch_ranked(specialty, client, window_days, today, mode):
        from app.schemas.trending import TrendingArticle

        key = (specialty, mode, window_days)
        call_counts[key] += 1
        pmids = ["1", "2"] if call_counts[key] == 1 else ["2", "1"]
        return [
            TrendingArticle(
                pmid=pmid, title=f"t{pmid}", abstract=None, authors=[], journal=None,
                pub_date="2024/Jan", doi=None, citation_count=10, velocity=0.5,
            )
            for pmid in pmids
        ]

    import app.services.trending as trending_service

    monkeypatch.setattr(trending_service, "_fetch_ranked", fake_fetch_ranked)

    # Act — two scheduled prewarm passes, no simulated "traffic" in between
    await trending_prewarm.prewarm_all(AsyncMock())
    await trending_prewarm.prewarm_all(AsyncMock())

    # Assert — a combination nobody "visited" still ended up with a real badge
    db = sessionLocal()
    latest = (
        db.query(TrendingSnapshot)
        .filter(
            TrendingSnapshot.specialty == "cardiology",
            TrendingSnapshot.mode == "trending",
            TrendingSnapshot.window_days == 365,
        )
        .order_by(TrendingSnapshot.computed_at.desc())
        .first()
    )
    results = attach_rank_movements(db, latest)
    moved = next(a for a in results if a.pmid == "2")
    assert moved.rank_delta == 1
    assert moved.is_new is False
    db.close()
