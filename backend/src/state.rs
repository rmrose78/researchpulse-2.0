use moka::future::Cache;
use sqlx::PgPool;
use std::sync::Arc;
use std::time::Duration;

use crate::models::article::SearchResponse;
use crate::services::entrez::EntrezClient;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub entrez: Arc<EntrezClient>,
    pub search_cache: Cache<String, SearchResponse>,
}

impl AppState {
    pub fn new(pool: PgPool, entrez: EntrezClient) -> Self {
        let search_cache = Cache::builder()
            .max_capacity(1000)
            .time_to_live(Duration::from_secs(30 * 60))
            .build();

        Self {
            pool,
            entrez: Arc::new(entrez),
            search_cache,
        }
    }
}
