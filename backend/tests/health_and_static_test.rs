use axum::{
    body::Body,
    http::{header, Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::Value;
use sqlx::postgres::PgPoolOptions;
use tower::ServiceExt;

async fn setup_app() -> axum::Router {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://localhost/researchpulse".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to test database");

    let entrez = researchpulse::services::entrez::EntrezClient::new(
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils".to_string(),
        None,
    );
    let semantic_scholar = researchpulse::services::semantic_scholar::SemanticScholarClient::new(
        "https://api.semanticscholar.org".to_string(),
        None,
    );
    let state = researchpulse::AppState::new(pool, entrez, semantic_scholar);
    researchpulse::create_router(state)
}

#[tokio::test]
async fn test_health_check_returns_ok() {
    // Arrange
    let app = setup_app().await;
    let request = Request::builder()
        .uri("/api/health")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    // Act
    let response = app.oneshot(request).await.unwrap();

    // Assert
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers().get(header::CONTENT_TYPE).unwrap(),
        "application/json"
    );

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["status"], "ok");
    assert_eq!(json["version"], "0.1.0");
}

#[tokio::test]
async fn test_root_path_serves_index_html() {
    // Arrange
    let app = setup_app().await;
    let request = Request::builder()
        .uri("/")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    // Act
    let response = app.oneshot(request).await.unwrap();

    // Assert
    assert_eq!(response.status(), StatusCode::OK);
    let content_type = response
        .headers()
        .get(header::CONTENT_TYPE)
        .unwrap()
        .to_str()
        .unwrap();
    assert!(content_type.contains("text/html"));

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let html = String::from_utf8_lossy(&body);
    assert!(html.contains("<html") || html.contains("<!DOCTYPE html>"));
}

#[tokio::test]
async fn test_spa_client_routes_fallback_to_index_html() {
    // Arrange
    let app = setup_app().await;
    let trending_request = Request::builder()
        .uri("/trending")
        .method("GET")
        .body(Body::empty())
        .unwrap();
    let reading_list_request = Request::builder()
        .uri("/reading-list")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    // Act & Assert for /trending
    let response = app.clone().oneshot(trending_request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let ct = response
        .headers()
        .get(header::CONTENT_TYPE)
        .unwrap()
        .to_str()
        .unwrap();
    assert!(ct.contains("text/html"));

    // Act & Assert for /reading-list
    let response = app.oneshot(reading_list_request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let ct = response
        .headers()
        .get(header::CONTENT_TYPE)
        .unwrap()
        .to_str()
        .unwrap();
    assert!(ct.contains("text/html"));
}

#[tokio::test]
async fn test_static_assets_serve_with_correct_mime() {
    // Arrange
    let app = setup_app().await;
    let request = Request::builder()
        .uri("/favicon.svg")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    // Act
    let response = app.oneshot(request).await.unwrap();

    // Assert
    assert_eq!(response.status(), StatusCode::OK);
    let ct = response
        .headers()
        .get(header::CONTENT_TYPE)
        .unwrap()
        .to_str()
        .unwrap();
    assert!(ct.contains("svg"));
}

#[tokio::test]
async fn test_missing_file_with_extension_returns_404() {
    // Arrange
    let app = setup_app().await;
    let request = Request::builder()
        .uri("/assets/nonexistent_file.js")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    // Act
    let response = app.oneshot(request).await.unwrap();

    // Assert
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
