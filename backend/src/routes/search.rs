use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde_json::json;

use crate::{
    models::article::{SearchQueryParams, SearchResponse},
    state::AppState,
};

pub async fn search_articles(
    State(state): State<AppState>,
    Query(params): Query<SearchQueryParams>,
) -> Result<Json<SearchResponse>, (StatusCode, Json<serde_json::Value>)> {
    let query_str = params.q.trim();
    if query_str.is_empty() {
        return Ok(Json(SearchResponse {
            total: 0,
            results: Vec::new(),
            query: String::new(),
        }));
    }

    let max_results = params.max_results.unwrap_or(20);
    let offset = params.offset.unwrap_or(0);
    let journal = params.journal.as_deref();
    let date_from = params.date_from.as_deref();
    let date_to = params.date_to.as_deref();

    let cache_key = format!(
        "{}:{}:{}:{}:{}:{}",
        query_str,
        max_results,
        offset,
        journal.unwrap_or(""),
        date_from.unwrap_or(""),
        date_to.unwrap_or("")
    );

    if let Some(cached) = state.search_cache.get(&cache_key).await {
        return Ok(Json(cached));
    }

    let response = state
        .entrez
        .search(query_str, max_results, offset, journal, date_from, date_to)
        .await
        .map_err(|e| {
            (
                StatusCode::BAD_GATEWAY,
                Json(json!({ "detail": format!("PubMed API error: {}", e) })),
            )
        })?;

    state.search_cache.insert(cache_key, response.clone()).await;

    Ok(Json(response))
}
