from datetime import datetime, timedelta, timezone
from app.database import sessionLocal
from app.models.trending import TrendingSnapshot
from app.services.trending import _previous_snapshot, _rank_movements, attach_rank_movements


def _make_snapshot(
    db, specialty: str, mode: str, window_days: int, computed_at: datetime, payload: list[dict]
) -> TrendingSnapshot:
    snapshot = TrendingSnapshot(
        specialty=specialty,
        mode=mode,
        window_days=window_days,
        computed_at=computed_at,
        payload=payload,
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def _delete_snapshots(db, specialty: str):
    db.query(TrendingSnapshot).filter(TrendingSnapshot.specialty == specialty).delete()
    db.commit()


def _payload_article(pmid: str) -> dict:
    return {
        "pmid": pmid,
        "title": f"Article {pmid}",
        "abstract": None,
        "authors": [],
        "journal": None,
        "pub_date": "2024/Jan",
        "doi": None,
        "publication_types": [],
        "citation_count": 0,
        "velocity": 0.0,
        "notable_type": None,
    }


def test_rank_movements_marks_new_when_absent_from_previous_snapshot():
    # Arrange
    previous_payload = [{"pmid": "1"}, {"pmid": "2"}]
    current_payload = [{"pmid": "1"}, {"pmid": "3"}]

    # Act
    movements = _rank_movements(current_payload, previous_payload)

    # Assert
    assert movements["3"] == (None, True)


def test_rank_movements_positive_delta_when_article_moved_up():
    # Arrange — "3" was at index 2, now at index 0 -> moved up 2 spots
    previous_payload = [{"pmid": "1"}, {"pmid": "2"}, {"pmid": "3"}]
    current_payload = [{"pmid": "3"}, {"pmid": "1"}, {"pmid": "2"}]

    # Act
    movements = _rank_movements(current_payload, previous_payload)

    # Assert
    assert movements["3"] == (2, False)


def test_rank_movements_negative_delta_when_article_moved_down():
    # Arrange — "1" was at index 0, now at index 2 -> moved down 2 spots
    previous_payload = [{"pmid": "1"}, {"pmid": "2"}, {"pmid": "3"}]
    current_payload = [{"pmid": "2"}, {"pmid": "3"}, {"pmid": "1"}]

    # Act
    movements = _rank_movements(current_payload, previous_payload)

    # Assert
    assert movements["1"] == (-2, False)


def test_rank_movements_omits_unchanged_rank():
    # Arrange
    previous_payload = [{"pmid": "1"}, {"pmid": "2"}]
    current_payload = [{"pmid": "1"}, {"pmid": "2"}]

    # Act
    movements = _rank_movements(current_payload, previous_payload)

    # Assert
    assert "1" not in movements
    assert "2" not in movements


def test_rank_movements_empty_when_no_previous_snapshot():
    # Arrange
    current_payload = [{"pmid": "1"}, {"pmid": "2"}]

    # Act
    movements = _rank_movements(current_payload, None)

    # Assert
    assert movements == {}


def test_rank_movements_ignores_pmid_that_dropped_out_of_current():
    # Arrange — "2" was in the previous snapshot but isn't ranked anymore
    previous_payload = [{"pmid": "1"}, {"pmid": "2"}]
    current_payload = [{"pmid": "1"}]

    # Act
    movements = _rank_movements(current_payload, previous_payload)

    # Assert
    assert list(movements.keys()) == []


def test_previous_snapshot_returns_none_when_only_one_snapshot_exists():
    # Arrange
    db = sessionLocal()
    specialty = "test_previous_snapshot_only_one"
    _delete_snapshots(db, specialty)
    now = datetime.now(timezone.utc)
    snapshot = _make_snapshot(db, specialty, "trending", 365, now, [{"pmid": "1"}])

    # Act
    previous = _previous_snapshot(db, specialty, 365, "trending", snapshot.computed_at)

    # Assert
    assert previous is None
    _delete_snapshots(db, specialty)
    db.close()


def test_attach_rank_movements_sets_delta_from_previous_snapshot():
    # Arrange
    db = sessionLocal()
    specialty = "test_attach_rank_movements_delta"
    _delete_snapshots(db, specialty)
    _make_snapshot(
        db, specialty, "trending", 365, datetime.now(timezone.utc) - timedelta(hours=1),
        [_payload_article("1"), _payload_article("2")],
    )
    current = _make_snapshot(
        db, specialty, "trending", 365, datetime.now(timezone.utc),
        [_payload_article("2"), _payload_article("1")],
    )

    # Act
    results = attach_rank_movements(db, current)

    # Assert — "2" moved from index 1 to index 0 -> up 1
    moved_up = next(a for a in results if a.pmid == "2")
    assert moved_up.rank_delta == 1
    assert moved_up.is_new is False
    _delete_snapshots(db, specialty)
    db.close()


def test_attach_rank_movements_returns_no_badges_when_no_previous_snapshot():
    # Arrange
    db = sessionLocal()
    specialty = "test_attach_rank_movements_cold_start"
    _delete_snapshots(db, specialty)
    current = _make_snapshot(
        db, specialty, "trending", 365, datetime.now(timezone.utc),
        [_payload_article("1"), _payload_article("2")],
    )

    # Act
    results = attach_rank_movements(db, current)

    # Assert — first-ever snapshot: nobody is marked NEW or moved
    assert all(a.rank_delta is None and a.is_new is False for a in results)
    _delete_snapshots(db, specialty)
    db.close()


def test_previous_snapshot_finds_second_most_recent_row():
    # Arrange
    db = sessionLocal()
    specialty = "test_previous_snapshot_second_most_recent"
    _delete_snapshots(db, specialty)
    older = _make_snapshot(
        db, specialty, "trending", 365, datetime.now(timezone.utc) - timedelta(hours=1), [{"pmid": "1"}]
    )
    newer = _make_snapshot(db, specialty, "trending", 365, datetime.now(timezone.utc), [{"pmid": "2"}])

    # Act
    previous = _previous_snapshot(db, specialty, 365, "trending", newer.computed_at)

    # Assert
    assert previous is not None
    assert previous.id == older.id
    _delete_snapshots(db, specialty)
    db.close()


def test_previous_snapshot_ignores_rows_from_a_different_mode():
    # Arrange
    db = sessionLocal()
    specialty = "test_previous_snapshot_different_mode"
    _delete_snapshots(db, specialty)
    _make_snapshot(
        db, specialty, "most_cited", 365, datetime.now(timezone.utc) - timedelta(hours=1), [{"pmid": "1"}]
    )
    newer = _make_snapshot(db, specialty, "trending", 365, datetime.now(timezone.utc), [{"pmid": "2"}])

    # Act
    previous = _previous_snapshot(db, specialty, 365, "trending", newer.computed_at)

    # Assert
    assert previous is None
    _delete_snapshots(db, specialty)
    db.close()


def test_previous_snapshot_ignores_rows_from_a_different_window_days():
    # Arrange
    db = sessionLocal()
    specialty = "test_previous_snapshot_different_window"
    _delete_snapshots(db, specialty)
    _make_snapshot(
        db, specialty, "trending", 60, datetime.now(timezone.utc) - timedelta(hours=1), [{"pmid": "1"}]
    )
    newer = _make_snapshot(db, specialty, "trending", 365, datetime.now(timezone.utc), [{"pmid": "2"}])

    # Act
    previous = _previous_snapshot(db, specialty, 365, "trending", newer.computed_at)

    # Assert
    assert previous is None
    _delete_snapshots(db, specialty)
    db.close()
