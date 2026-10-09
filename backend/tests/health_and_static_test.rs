use axum::{
    body::Body,
    http::{header, Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::Value;
use tower::ServiceExt;

#[tokio::test]
async fn test_health_check_returns_ok() {
    // Arrange
    let app = researchpulse::create_router();
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
    let app = researchpulse::create_router();
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
    let app = researchpulse::create_router();
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
    let app = researchpulse::create_router();
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
    let app = researchpulse::create_router();
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
