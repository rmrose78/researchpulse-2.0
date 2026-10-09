use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde_json::json;

use crate::{
    models::analytics::{AnalyticsQueryParams, AnalyticsSummary, PageViewCreate},
    services::analytics::{get_summary, record_pageview},
    state::AppState,
};

pub async fn create_pageview(
    State(state): State<AppState>,
    Json(payload): Json<PageViewCreate>,
) -> StatusCode {
    // Non-blocking fire-and-forget ingestion so analytics never slows client down
    let pool = state.pool.clone();
    tokio::spawn(async move {
        let _ = record_pageview(&pool, &payload.path, payload.referrer.as_deref()).await;
    });

    StatusCode::NO_CONTENT
}

pub async fn get_analytics_summary(
    State(state): State<AppState>,
    Query(params): Query<AnalyticsQueryParams>,
) -> Result<Json<AnalyticsSummary>, (StatusCode, Json<serde_json::Value>)> {
    let secret = match state.analytics_secret_key {
        Some(ref s) if !s.trim().is_empty() => s,
        _ => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(
                    json!({ "detail": "Analytics dashboard is not configured or secret key is invalid" }),
                ),
            ));
        }
    };

    let provided = params.key.as_deref().unwrap_or("");
    if provided != secret {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "detail": "Unauthorized: invalid secret key" })),
        ));
    }

    match get_summary(&state.pool).await {
        Ok(summary) => Ok(Json(summary)),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "detail": format!("Database error: {}", e) })),
        )),
    }
}
