use axum::{
    body::Body,
    http::{header, Request, StatusCode},
};
use chrono::{Datelike, Timelike, Utc};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use sqlx::postgres::PgPoolOptions;
use tower::ServiceExt;

use researchpulse::services::analytics::bucket_start;

const TEST_SECRET: &str = "super_secret_analytics_key";

async fn setup_test_app() -> axum::Router {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://localhost/researchpulse".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to test database");

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    let entrez = researchpulse::services::entrez::EntrezClient::new(
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils".to_string(),
        None,
    );
    let semantic_scholar = researchpulse::services::semantic_scholar::SemanticScholarClient::new(
        "https://api.semanticscholar.org".to_string(),
        None,
    );
    let state = researchpulse::AppState::new(pool, entrez, semantic_scholar)
        .with_analytics_secret(Some(TEST_SECRET.to_string()));
    researchpulse::create_router(state)
}

#[test]
fn test_bucket_start_calculations() {
    let now = Utc::now();
    let today = bucket_start(now, "today").unwrap();
    assert_eq!(today.hour(), 0);
    assert_eq!(today.minute(), 0);
    assert_eq!(today.second(), 0);

    let this_week = bucket_start(now, "this_week").unwrap();
    assert_eq!(this_week.weekday().to_string(), "Mon");

    let this_month = bucket_start(now, "this_month").unwrap();
    assert_eq!(this_month.day(), 1);

    let this_year = bucket_start(now, "this_year").unwrap();
    assert_eq!(this_year.month(), 1);
    assert_eq!(this_year.day(), 1);

    assert!(bucket_start(now, "all_time").is_none());
}

#[tokio::test]
async fn test_pageview_ingestion_and_protected_summary() {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://localhost/researchpulse".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to test database");

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    // Clean up test data
    sqlx::query("DELETE FROM page_views")
        .execute(&pool)
        .await
        .unwrap();

    let app = setup_test_app().await;

    // 1. Ingest pageview via POST /api/analytics/pageview
    let req = Request::builder()
        .uri("/api/analytics/pageview")
        .method("POST")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            json!({
                "path": "/trending",
                "referrer": "https://news.ycombinator.com"
            })
            .to_string(),
        ))
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT);

    // Ingest another with direct (null) referrer
    let req2 = Request::builder()
        .uri("/api/analytics/pageview")
        .method("POST")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            json!({
                "path": "/search",
                "referrer": ""
            })
            .to_string(),
        ))
        .unwrap();

    let res2 = app.clone().oneshot(req2).await.unwrap();
    assert_eq!(res2.status(), StatusCode::NO_CONTENT);

    // Allow tokio spawn to persist to DB
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    // 2. Unauthorized access to GET /api/analytics/summary
    let unauth_req = Request::builder()
        .uri("/api/analytics/summary")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let unauth_res = app.clone().oneshot(unauth_req).await.unwrap();
    assert_eq!(unauth_res.status(), StatusCode::UNAUTHORIZED);

    let wrong_key_req = Request::builder()
        .uri("/api/analytics/summary?key=wrong_password")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let wrong_key_res = app.clone().oneshot(wrong_key_req).await.unwrap();
    assert_eq!(wrong_key_res.status(), StatusCode::UNAUTHORIZED);

    // 3. Authorized access with correct key
    let auth_req = Request::builder()
        .uri(format!("/api/analytics/summary?key={}", TEST_SECRET))
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let auth_res = app.clone().oneshot(auth_req).await.unwrap();
    assert_eq!(auth_res.status(), StatusCode::OK);

    let body = auth_res.into_body().collect().await.unwrap().to_bytes();
    let summary: Value = serde_json::from_slice(&body).unwrap();

    // Check buckets exist
    assert!(summary.get("today").is_some());
    assert!(summary.get("this_week").is_some());
    assert!(summary.get("this_month").is_some());
    assert!(summary.get("this_year").is_some());
    assert!(summary.get("all_time").is_some());

    let today = &summary["today"];
    assert_eq!(today["total_views"], 2);

    let top_paths = today["top_paths"].as_array().unwrap();
    assert_eq!(top_paths.len(), 2);

    let top_referrers = today["top_referrers"].as_array().unwrap();
    // One from HN, one Direct
    let has_direct = top_referrers.iter().any(|r| r["referrer"] == "Direct");
    let has_hn = top_referrers
        .iter()
        .any(|r| r["referrer"] == "https://news.ycombinator.com");
    assert!(has_direct, "Should contain Direct referrer");
    assert!(has_hn, "Should contain HN referrer");
}
