import asyncio
from datetime import date, datetime, timedelta, timezone
from datetime import datetime as dt
import httpx
from sqlalchemy.orm import Session
from app.database import sessionLocal
from app.models.trending import TrendingSnapshot
from app.schemas.pubmed import ArticleSearchResult
from app.schemas.trending import TrendingArticle
from app.services.pubmed import pubmed_service
from app.services.semantic_scholar import semantic_scholar_service
from app.services.specialties import SPECIALTY_KEYWORDS, SPECIALTY_QUERIES

VALID_MODES = {"trending", "most_cited", "new_notable"}
DEFAULT_MODE = "trending"
CACHE_TTL = timedelta(hours=8)
# NCBI's efetch (GET, comma-joined ids) starts hitting URL-length limits well
# before Semantic Scholar's own batch cap — 200 is comfortably under both.
POOL_SIZE = 200
# The user-selectable time ranges (frontend dropdown) — 60 days, 6 months,
# 1 year, 2 years. `get_trending` rejects any other value.
VALID_WINDOW_DAYS = {60, 180, 365, 730}
DEFAULT_WINDOW_DAYS = 365
# PubMed's esearch always returns newest-first, so a single query over a wide
# window only ever samples its freshest slice — articles too new to have any
# Semantic Scholar citation linkage yet. Splitting the selected window into
# ~90-day slices and sampling from each one gives older-in-window articles
# (which have had time to accrue citations) real representation, however
# wide the window is.
SLICE_LENGTH_DAYS = 90
# Velocity smoothing constant — keeps very-new articles from dividing by a
# near-zero age and dominating the ranking on a single early citation.
VELOCITY_AGE_SMOOTHING_DAYS = 21
# Evidence-based-medicine hierarchy — the real "notability" signal for New &
# Notable, sourced straight from PubMed's own PublicationType metadata rather
# than invented. Lower number = higher evidence tier. Anything not listed
# here (plain "Journal Article", Case Reports, Letters, etc.) is untiered:
# no badge, and it sorts after every tiered article.
NOTABILITY_TIERS: dict[str, int] = {
    "Meta-Analysis": 1,
    "Systematic Review": 1,
    "Randomized Controlled Trial": 2,
    "Clinical Trial": 3,
    "Clinical Trial, Phase I": 3,
    "Clinical Trial, Phase II": 3,
    "Clinical Trial, Phase III": 3,
    "Clinical Trial, Phase IV": 3,
    "Multicenter Study": 3,
    "Comparative Study": 3,
}
UNTIERED_NOTABILITY = 99


class UnknownSpecialtyError(ValueError):
    pass


class InvalidWindowError(ValueError):
    pass


class UnknownModeError(ValueError):
    pass


# --- Pure ranking helpers (no I/O) -----------------------------------------

def _parse_month(month_str: str) -> int | None:
    month_str = month_str.strip()
    if month_str.isdigit():
        month = int(month_str)
        return month if 1 <= month <= 12 else None
    for fmt in ("%b", "%B"):
        try:
            return dt.strptime(month_str, fmt).month
        except ValueError:
            continue
    return None


def _parse_pub_date(pub_date: str | None) -> date | None:
    if not pub_date:
        return None
    parts = pub_date.split("/")
    if len(parts) < 2 or not parts[0].isdigit():
        return None
    month = _parse_month(parts[1])
    if month is None:
        return None
    return date(int(parts[0]), month, 1)


def age_days(pub_date: str | None, today: date) -> int | None:
    parsed = _parse_pub_date(pub_date)
    if parsed is None:
        return None
    return max((today - parsed).days, 0)


def compute_velocity(citation_count: int, age_in_days: int) -> float:
    return citation_count / (age_in_days + VELOCITY_AGE_SMOOTHING_DAYS)


def _notability(publication_types: list[str]) -> tuple[int, str] | None:
    matches = [(NOTABILITY_TIERS[pt], pt) for pt in publication_types if pt in NOTABILITY_TIERS]
    if not matches:
        return None
    return min(matches, key=lambda match: match[0])


def _previous_snapshot(
    db: Session, specialty: str, window_days: int, mode: str, before: datetime
) -> TrendingSnapshot | None:
    return (
        db.query(TrendingSnapshot)
        .filter(
            TrendingSnapshot.specialty == specialty,
            TrendingSnapshot.mode == mode,
            TrendingSnapshot.window_days == window_days,
            TrendingSnapshot.computed_at < before,
        )
        .order_by(TrendingSnapshot.computed_at.desc())
        .first()
    )


def _rank_movements(
    current_payload: list[dict], previous_payload: list[dict] | None
) -> dict[str, tuple[int | None, bool]]:
    """pmid -> (delta, is_new). An entry is only present when there's
    something to show — unchanged rank and 'no previous snapshot at all'
    both mean 'not in this dict', so callers default missing keys to
    (None, False) rather than treating absence as an error."""
    if previous_payload is None:
        return {}
    previous_ranks = {article["pmid"]: i for i, article in enumerate(previous_payload)}
    movements: dict[str, tuple[int | None, bool]] = {}
    for i, article in enumerate(current_payload):
        pmid = article["pmid"]
        if pmid not in previous_ranks:
            movements[pmid] = (None, True)
        else:
            delta = previous_ranks[pmid] - i
            if delta != 0:
                movements[pmid] = (delta, False)
    return movements


def _build_query(specialty: str, mode: str) -> str:
    mesh_query = SPECIALTY_QUERIES[specialty]
    if mode != "new_notable":
        return mesh_query
    keyword_query = " OR ".join(
        f'"{keyword}"[Title/Abstract]' for keyword in SPECIALTY_KEYWORDS[specialty]
    )
    return f"({mesh_query}) OR ({keyword_query})"


def rank_articles(
    articles: list[ArticleSearchResult],
    citation_counts: dict[str, int],
    today: date,
    mode: str = DEFAULT_MODE,
) -> list[TrendingArticle]:
    ranked: list[TrendingArticle] = []
    for article in articles:
        count = citation_counts.get(article.pmid, 0)
        # New & Notable is recency-driven, not citation-driven — a 0-citation
        # (or entirely unmatched) article is exactly the case it exists for.
        if count == 0 and mode != "new_notable":
            continue
        days = age_days(article.pub_date, today)
        if days is None:
            continue
        notable_type = None
        if mode == "new_notable":
            notability = _notability(article.publication_types)
            if notability is not None:
                notable_type = notability[1]
        ranked.append(
            TrendingArticle(
                **article.model_dump(),
                citation_count=count,
                velocity=compute_velocity(count, days),
                notable_type=notable_type,
                age_days=days,
            )
        )
    if mode == "most_cited":
        ranked.sort(key=lambda a: a.citation_count, reverse=True)
    elif mode == "new_notable":
        def _new_notable_sort_key(a: TrendingArticle) -> tuple[int, int]:
            notability = _notability(a.publication_types)
            tier = notability[0] if notability else UNTIERED_NOTABILITY
            return (tier, age_days(a.pub_date, today) or 0)
        ranked.sort(key=_new_notable_sort_key)
    else:
        ranked.sort(key=lambda a: a.velocity, reverse=True)
    return ranked


def is_stale(snapshot: TrendingSnapshot, now: datetime) -> bool:
    computed_at = snapshot.computed_at
    if computed_at.tzinfo is None:
        computed_at = computed_at.replace(tzinfo=timezone.utc)
    return now - computed_at > CACHE_TTL


def window_slices(today: date, window_days: int) -> list[tuple[str, str]]:
    """Split [today - window_days, today] into ~SLICE_LENGTH_DAYS-long date
    ranges (formatted for PubMed's date filter), oldest slice last."""
    num_slices = max(1, round(window_days / SLICE_LENGTH_DAYS))
    slice_length = window_days / num_slices
    slices = []
    for i in range(num_slices):
        end_offset = round(i * slice_length)
        start_offset = round((i + 1) * slice_length)
        date_to = (today - timedelta(days=end_offset)).strftime("%Y/%m/%d")
        date_from = (today - timedelta(days=start_offset)).strftime("%Y/%m/%d")
        slices.append((date_from, date_to))
    return slices


# --- PubMed pool + citation lookup ------------------------------------------

async def _fetch_sliced_pool(
    mesh_query: str, client: httpx.AsyncClient, today: date, window_days: int
) -> list[ArticleSearchResult]:
    slices = window_slices(today, window_days)
    per_slice = max(1, POOL_SIZE // len(slices))

    all_articles: list[ArticleSearchResult] = []
    seen_pmids: set[str] = set()
    for date_from, date_to in slices:
        response = await pubmed_service.search(
            query=mesh_query,
            max_results=per_slice,
            date_from=date_from,
            date_to=date_to,
            client=client,
        )
        for article in response.results:
            if article.pmid not in seen_pmids:
                seen_pmids.add(article.pmid)
                all_articles.append(article)
    return all_articles


async def _fetch_newest(
    mesh_query: str, client: httpx.AsyncClient, today: date, window_days: int
) -> list[ArticleSearchResult]:
    # New & Notable: a single query across the whole window, relying on
    # PubMed's newest-first ordering — unlike the sliced pool, this never
    # thins the newest candidates as window_days grows, since the full
    # POOL_SIZE budget always goes to this one most-recent query.
    date_from = (today - timedelta(days=window_days)).strftime("%Y/%m/%d")
    date_to = today.strftime("%Y/%m/%d")
    response = await pubmed_service.search(
        query=mesh_query,
        max_results=POOL_SIZE,
        date_from=date_from,
        date_to=date_to,
        client=client,
    )
    return list(response.results)


async def _rank_for_window(
    mesh_query: str,
    client: httpx.AsyncClient,
    today: date,
    window_days: int,
    mode: str = DEFAULT_MODE,
) -> list[TrendingArticle]:
    if mode == "new_notable":
        all_articles = await _fetch_newest(mesh_query, client, today, window_days)
    else:
        all_articles = await _fetch_sliced_pool(mesh_query, client, today, window_days)

    pmids = [article.pmid for article in all_articles]
    citation_counts = await semantic_scholar_service.get_citation_counts(client, pmids)
    return rank_articles(all_articles, citation_counts, today, mode)


async def _fetch_ranked(
    specialty: str,
    client: httpx.AsyncClient,
    window_days: int,
    today: date,
    mode: str = DEFAULT_MODE,
) -> list[TrendingArticle]:
    query = _build_query(specialty, mode)
    return await _rank_for_window(query, client, today, window_days, mode)


# --- Cache read/write + single-flight refresh --------------------------------

_locks: dict[str, asyncio.Lock] = {}


def _lock_for(specialty: str, window_days: int, mode: str = DEFAULT_MODE) -> asyncio.Lock:
    key = f"{specialty}:{mode}:{window_days}"
    if key not in _locks:
        _locks[key] = asyncio.Lock()
    return _locks[key]


def _latest_snapshot(
    db: Session, specialty: str, window_days: int, mode: str = DEFAULT_MODE
) -> TrendingSnapshot | None:
    return (
        db.query(TrendingSnapshot)
        .filter(
            TrendingSnapshot.specialty == specialty,
            TrendingSnapshot.mode == mode,
            TrendingSnapshot.window_days == window_days,
        )
        .order_by(TrendingSnapshot.computed_at.desc())
        .first()
    )


async def _compute_and_store(
    db: Session, client: httpx.AsyncClient, specialty: str, window_days: int, mode: str = DEFAULT_MODE
) -> TrendingSnapshot:
    today = datetime.now(timezone.utc).date()
    ranked = await _fetch_ranked(specialty, client, window_days, today, mode)
    snapshot = TrendingSnapshot(
        specialty=specialty,
        mode=mode,
        window_days=window_days,
        payload=[article.model_dump(mode="json") for article in ranked],
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


async def _background_refresh(
    specialty: str, window_days: int, client: httpx.AsyncClient, mode: str = DEFAULT_MODE
) -> None:
    lock = _lock_for(specialty, window_days, mode)
    if lock.locked():
        return
    async with lock:
        db = sessionLocal()
        try:
            await _compute_and_store(db, client, specialty, window_days, mode)
        finally:
            db.close()


async def get_trending(
    db: Session, client: httpx.AsyncClient, specialty: str, window_days: int, mode: str = DEFAULT_MODE
) -> TrendingSnapshot:
    if specialty not in SPECIALTY_QUERIES:
        raise UnknownSpecialtyError(f"Unknown specialty '{specialty}'")
    if window_days not in VALID_WINDOW_DAYS:
        raise InvalidWindowError(f"Unsupported window_days '{window_days}'")
    if mode not in VALID_MODES:
        raise UnknownModeError(f"Unsupported mode '{mode}'")

    latest = _latest_snapshot(db, specialty, window_days, mode)

    if latest is None:
        # Cold cache — the very first request for this (specialty, mode,
        # window_days) blocks on a live computation, guarded by a per-key
        # single-flight lock so concurrent cold requests only compute once.
        lock = _lock_for(specialty, window_days, mode)
        async with lock:
            latest = _latest_snapshot(db, specialty, window_days, mode)
            if latest is None:
                latest = await _compute_and_store(db, client, specialty, window_days, mode)
        return latest

    if is_stale(latest, datetime.now(timezone.utc)):
        # Stale-while-revalidate — serve the last good snapshot immediately,
        # refresh in the background rather than blocking this request.
        asyncio.create_task(_background_refresh(specialty, window_days, client, mode))

    return latest


def has_previous_snapshot(db: Session, snapshot: TrendingSnapshot) -> bool:
    """Whether a comparison was even possible for this snapshot — distinct
    from whether anything actually moved. Lets callers tell 'no badges
    because this is the first computation ever for this combination' apart
    from 'no badges because a real comparison found no change,' which
    attach_rank_movements' per-article output alone can't distinguish."""
    return (
        _previous_snapshot(db, snapshot.specialty, snapshot.window_days, snapshot.mode, snapshot.computed_at)
        is not None
    )


def attach_rank_movements(db: Session, snapshot: TrendingSnapshot) -> list[TrendingArticle]:
    """Diffs `snapshot` against the next-most-recent snapshot for the same
    (specialty, mode, window_days) key, computed fresh on every call since
    'the two most recent snapshots' shifts as new rows get written — the
    stored payload itself is never mutated with this data."""
    previous = _previous_snapshot(
        db, snapshot.specialty, snapshot.window_days, snapshot.mode, snapshot.computed_at
    )
    movements = _rank_movements(snapshot.payload, previous.payload if previous else None)
    results = []
    for article_dict in snapshot.payload:
        delta, is_new = movements.get(article_dict["pmid"], (None, False))
        results.append(TrendingArticle(**{**article_dict, "rank_delta": delta, "is_new": is_new}))
    return results


def list_cached_availability(
    db: Session, window_days: int, mode: str = DEFAULT_MODE
) -> dict[str, bool]:
    """Cache-only lookup (no external calls): which specialties are already
    known, from a previously computed snapshot, to have zero qualifying
    results at this (mode, window_days). A specialty with no cached row yet
    is simply omitted — callers should treat "missing" as "not yet known",
    not "has results"."""
    rows = (
        db.query(TrendingSnapshot.specialty, TrendingSnapshot.payload)
        .filter(TrendingSnapshot.mode == mode, TrendingSnapshot.window_days == window_days)
        .order_by(TrendingSnapshot.specialty, TrendingSnapshot.computed_at.desc())
        .all()
    )
    availability: dict[str, bool] = {}
    for specialty, payload in rows:
        if specialty not in availability:
            availability[specialty] = len(payload) > 0
    return availability
