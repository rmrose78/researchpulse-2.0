CREATE TABLE IF NOT EXISTS saved_articles (
    id SERIAL PRIMARY KEY,
    pmid VARCHAR(20) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    authors TEXT,
    journal VARCHAR(255),
    pub_date VARCHAR(20),
    doi VARCHAR(255),
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_articles_pmid ON saved_articles(pmid);
CREATE INDEX IF NOT EXISTS idx_saved_articles_saved_at ON saved_articles(saved_at DESC);
