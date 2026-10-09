use moka::future::Cache;
use sqlx::PgPool;
use std::sync::Arc;
use std::time::Duration;

use crate::models::article::SearchResponse;
use crate::services::entrez::EntrezClient;
use crate::services::semantic_scholar::SemanticScholarClient;
use crate::services::trending::FlightLocks;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub entrez: Arc<EntrezClient>,
    pub semantic_scholar: Arc<SemanticScholarClient>,
    pub search_cache: Cache<String, SearchResponse>,
    pub flight_locks: FlightLocks,
}

impl AppState {
    pub fn new(
        pool: PgPool,
        entrez: EntrezClient,
        semantic_scholar: SemanticScholarClient,
    ) -> Self {
        let search_cache = Cache::builder()
            .max_capacity(1000)
            .time_to_live(Duration::from_secs(30 * 60))
            .build();

        Self {
            pool,
            entrez: Arc::new(entrez),
            semantic_scholar: Arc::new(semantic_scholar),
            search_cache,
            flight_locks: FlightLocks::default(),
        }
    }
}
