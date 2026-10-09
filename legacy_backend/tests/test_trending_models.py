from app.models.trending import TrendingSnapshot


def test_trending_snapshot_defaults_mode_to_trending():
    # Arrange
    column = TrendingSnapshot.__table__.columns["mode"]

    # Act
    default_arg = column.default.arg

    # Assert
    assert default_arg == "trending"


def test_trending_snapshot_computed_at_default_is_callable_not_import_time():
    # Arrange
    column = TrendingSnapshot.__table__.columns["computed_at"]

    # Act
    default_arg = column.default.arg

    # Assert — a callable default is invoked fresh for each insert, matching
    # the saved_at fix in models/reading_list.py.
    assert callable(default_arg)


def test_trending_snapshot_specialty_is_indexed():
    # Arrange
    column = TrendingSnapshot.__table__.columns["specialty"]

    # Act & Assert
    assert column.index is True


def test_trending_snapshot_has_window_days_column():
    # Arrange
    column = TrendingSnapshot.__table__.columns["window_days"]

    # Act & Assert — part of the cache key alongside specialty/mode, so a
    # row must always have one; no sensible shared default across callers.
    assert column.nullable is False
