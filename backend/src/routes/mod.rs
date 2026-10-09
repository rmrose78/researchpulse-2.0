pub mod health;
pub mod static_files;

use axum::{routing::get, Router};

pub fn create_router() -> Router {
    Router::new()
        .route("/api/health", get(health::health_check))
        .fallback(static_files::static_handler)
}
