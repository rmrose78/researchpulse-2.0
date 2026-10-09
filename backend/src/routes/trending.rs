use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde_json::json;

use crate::{
    models::trending::{
        TrendingAvailabilityQueryParams, TrendingAvailabilityResponse, TrendingQueryParams,
        TrendingResponse,
    },
    services::specialties::{
        is_valid_mode, is_valid_specialty, is_valid_window_days, DEFAULT_MODE, DEFAULT_WINDOW_DAYS,
    },
    services::trending::{get_trending, list_cached_availability, TrendingError},
    state::AppState,
};

pub async fn get_trending_articles(
    State(state): State<AppState>,
    Query(params): Query<TrendingQueryParams>,
) -> Result<Json<TrendingResponse>, (StatusCode, Json<serde_json::Value>)> {
    let window_days = params.window_days.unwrap_or(DEFAULT_WINDOW_DAYS);
    let mode = params.mode.as_deref().unwrap_or(DEFAULT_MODE);

    if !is_valid_specialty(&params.specialty) {
        return Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({ "detail": format!("Unknown specialty '{}'", params.specialty) })),
        ));
    }

    if !is_valid_window_days(window_days) {
        return Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({ "detail": format!("Unsupported window_days '{}'", window_days) })),
        ));
    }

    if !is_valid_mode(mode) {
        return Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({ "detail": format!("Unsupported mode '{}'", mode) })),
        ));
    }

    match get_trending(
        &state.pool,
        &state.entrez,
        &state.semantic_scholar,
        &state.flight_locks,
        &params.specialty,
        window_days,
        mode,
    )
    .await
    {
        Ok(resp) => Ok(Json(resp)),
        Err(TrendingError::UnknownSpecialty(s)) => Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({ "detail": format!("Unknown specialty '{}'", s) })),
        )),
        Err(TrendingError::InvalidWindow(w)) => Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({ "detail": format!("Unsupported window_days '{}'", w) })),
        )),
        Err(TrendingError::UnknownMode(m)) => Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({ "detail": format!("Unsupported mode '{}'", m) })),
        )),
        Err(TrendingError::ExternalApi(e)) => Err((
            StatusCode::BAD_GATEWAY,
            Json(json!({ "detail": format!("Trending data unavailable: {}", e) })),
        )),
        Err(TrendingError::Database(e)) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "detail": format!("Database error: {}", e) })),
        )),
    }
}

pub async fn get_trending_availability(
    State(state): State<AppState>,
    Query(params): Query<TrendingAvailabilityQueryParams>,
) -> Result<Json<TrendingAvailabilityResponse>, (StatusCode, Json<serde_json::Value>)> {
    let window_days = params.window_days.unwrap_or(DEFAULT_WINDOW_DAYS);
    let mode = params.mode.as_deref().unwrap_or(DEFAULT_MODE);

    if !is_valid_window_days(window_days) {
        return Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({ "detail": format!("Unsupported window_days '{}'", window_days) })),
        ));
    }

    if !is_valid_mode(mode) {
        return Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(json!({ "detail": format!("Unsupported mode '{}'", mode) })),
        ));
    }

    match list_cached_availability(&state.pool, window_days, mode).await {
        Ok(available) => Ok(Json(TrendingAvailabilityResponse {
            window_days,
            mode: mode.to_string(),
            available,
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "detail": format!("Database error: {}", e) })),
        )),
    }
}
