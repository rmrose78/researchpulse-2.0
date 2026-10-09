use axum::{
    body::Body,
    http::{header, Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use sqlx::postgres::PgPoolOptions;
use tower::ServiceExt;

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
    let state = researchpulse::AppState::new(pool, entrez, semantic_scholar);
    researchpulse::create_router(state)
}

#[tokio::test]
async fn test_reading_list_crud_flow() {
    let app = setup_test_app().await;
    let test_pmid = "99999999";

    // Clean up any previous test artifact
    let cleanup_req = Request::builder()
        .uri(format!("/api/reading-list/{}", test_pmid))
        .method("DELETE")
        .body(Body::empty())
        .unwrap();
    let _ = app.clone().oneshot(cleanup_req).await;

    // 1. POST /api/reading-list/ (Create)
    let save_payload = json!({
        "pmid": test_pmid,
        "title": "Novel Insights into Molecular Biology",
        "authors": ["Watson, James", "Crick, Francis"],
        "journal": "Nature",
        "pub_date": "2024/01",
        "doi": "10.1038/nature12345"
    });

    let save_req = Request::builder()
        .uri("/api/reading-list/")
        .method("POST")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(save_payload.to_string()))
        .unwrap();

    let save_res = app.clone().oneshot(save_req).await.unwrap();
    assert_eq!(save_res.status(), StatusCode::CREATED);
    let save_body = save_res.into_body().collect().await.unwrap().to_bytes();

    let saved_json: Value = serde_json::from_slice(&save_body).unwrap();
    assert_eq!(saved_json["pmid"], test_pmid);
    assert_eq!(saved_json["title"], "Novel Insights into Molecular Biology");
    assert_eq!(saved_json["authors"], "Watson, James, Crick, Francis");
    assert!(saved_json["id"].is_number());
    assert!(saved_json["saved_at"].is_string());

    // 2. POST duplicate /api/reading-list/ (Expect 409 Conflict)
    let dup_req = Request::builder()
        .uri("/api/reading-list/")
        .method("POST")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(save_payload.to_string()))
        .unwrap();

    let dup_res = app.clone().oneshot(dup_req).await.unwrap();
    assert_eq!(dup_res.status(), StatusCode::CONFLICT);

    // 3. GET /api/reading-list/ (Verify list contains saved article)
    let get_req = Request::builder()
        .uri("/api/reading-list/")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let get_res = app.clone().oneshot(get_req).await.unwrap();
    assert_eq!(get_res.status(), StatusCode::OK);

    let get_body = get_res.into_body().collect().await.unwrap().to_bytes();
    let list_json: Vec<Value> = serde_json::from_slice(&get_body).unwrap();
    let found = list_json.iter().any(|item| item["pmid"] == test_pmid);
    assert!(found, "Saved article should be in reading list");

    // 4. GET /api/reading-list/citations
    let citations_req = Request::builder()
        .uri("/api/reading-list/citations")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let citations_res = app.clone().oneshot(citations_req).await.unwrap();
    assert_eq!(citations_res.status(), StatusCode::OK);

    // 5. DELETE /api/reading-list/{pmid} (Delete)
    let del_req = Request::builder()
        .uri(format!("/api/reading-list/{}", test_pmid))
        .method("DELETE")
        .body(Body::empty())
        .unwrap();

    let del_res = app.clone().oneshot(del_req).await.unwrap();
    assert_eq!(del_res.status(), StatusCode::NO_CONTENT);

    // 6. DELETE /api/reading-list/{pmid} again (Expect 404 Not Found)
    let del_404_req = Request::builder()
        .uri(format!("/api/reading-list/{}", test_pmid))
        .method("DELETE")
        .body(Body::empty())
        .unwrap();

    let del_404_res = app.oneshot(del_404_req).await.unwrap();
    assert_eq!(del_404_res.status(), StatusCode::NOT_FOUND);
}
