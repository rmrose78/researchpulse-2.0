CREATE TABLE IF NOT EXISTS trending_snapshots (
    id SERIAL PRIMARY KEY,
    specialty VARCHAR(64) NOT NULL,
    mode VARCHAR(32) NOT NULL DEFAULT 'trending',
    window_days INT NOT NULL,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trending_snapshots_lookup 
ON trending_snapshots(specialty, mode, window_days, computed_at DESC);
