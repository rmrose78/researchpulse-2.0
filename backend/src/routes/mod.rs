pub mod health;
pub mod reading_list;
pub mod search;
pub mod static_files;

use axum::{
    routing::{delete, get},
    Router,
};

use crate::state::AppState;

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/api/health", get(health::health_check))
        .route("/api/search", get(search::search_articles))
        .route("/api/search/", get(search::search_articles))
        .route(
            "/api/reading-list",
            get(reading_list::get_saved_articles).post(reading_list::save_article),
        )
        .route(
            "/api/reading-list/",
            get(reading_list::get_saved_articles).post(reading_list::save_article),
        )
        .route(
            "/api/reading-list/citations",
            get(reading_list::get_reading_list_citations),
        )
        .route(
            "/api/reading-list/{pmid}",
            delete(reading_list::remove_saved_article),
        )
        .with_state(state)
        .fallback(static_files::static_handler)
}
