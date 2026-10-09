use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::collections::HashMap;

use crate::{
    models::reading_list::{ReadingListCitationsResponse, SaveArticleRequest, SavedArticle},
    state::AppState,
};

pub async fn save_article(
    State(state): State<AppState>,
    Json(payload): Json<SaveArticleRequest>,
) -> Result<(StatusCode, Json<SavedArticle>), (StatusCode, Json<serde_json::Value>)> {
    let authors_str = if payload.authors.is_empty() {
        None
    } else {
        Some(payload.authors.join(", "))
    };

    let row = sqlx::query_as::<_, SavedArticle>(
        r#"
        INSERT INTO saved_articles (pmid, title, authors, journal, pub_date, doi, saved_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (pmid) DO NOTHING
        RETURNING id, pmid, title, authors, journal, pub_date, doi, saved_at
        "#,
    )
    .bind(&payload.pmid)
    .bind(&payload.title)
    .bind(&authors_str)
    .bind(&payload.journal)
    .bind(&payload.pub_date)
    .bind(&payload.doi)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "detail": e.to_string() })),
        )
    })?;

    match row {
        Some(article) => Ok((StatusCode::CREATED, Json(article))),
        None => Err((
            StatusCode::CONFLICT,
            Json(json!({ "detail": format!("Article {} already saved", payload.pmid) })),
        )),
    }
}

pub async fn get_saved_articles(
    State(state): State<AppState>,
) -> Result<Json<Vec<SavedArticle>>, (StatusCode, Json<serde_json::Value>)> {
    let articles = sqlx::query_as::<_, SavedArticle>(
        r#"
        SELECT id, pmid, title, authors, journal, pub_date, doi, saved_at
        FROM saved_articles
        ORDER BY saved_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "detail": e.to_string() })),
        )
    })?;

    Ok(Json(articles))
}

pub async fn remove_saved_article(
    State(state): State<AppState>,
    Path(pmid): Path<String>,
) -> Result<StatusCode, (StatusCode, Json<serde_json::Value>)> {
    let result = sqlx::query("DELETE FROM saved_articles WHERE pmid = $1")
        .bind(&pmid)
        .execute(&state.pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "detail": e.to_string() })),
            )
        })?;

    if result.rows_affected() == 0 {
        Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "detail": format!("Article {} not found in reading list", pmid) })),
        ))
    } else {
        Ok(StatusCode::NO_CONTENT)
    }
}

pub async fn get_reading_list_citations(State(state): State<AppState>) -> impl IntoResponse {
    let pmids = sqlx::query_scalar::<_, String>("SELECT pmid FROM saved_articles")
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    let citations = if pmids.is_empty() {
        HashMap::new()
    } else {
        state
            .semantic_scholar
            .get_citation_counts(&pmids)
            .await
            .unwrap_or_default()
    };

    Json(ReadingListCitationsResponse { citations })
}
