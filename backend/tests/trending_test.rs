use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use chrono::NaiveDate;
use http_body_util::BodyExt;
use serde_json::Value;
use sqlx::postgres::PgPoolOptions;
use std::collections::HashMap;
use tower::ServiceExt;

use researchpulse::models::article::ArticleSearchResultDto;
use researchpulse::models::trending::TrendingArticle;
use researchpulse::services::trending::{
    compute_velocity, notability_tier, rank_articles, window_slices,
};

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

#[test]
fn test_velocity_formula() {
    let age = 42;
    let citations = 63;
    // 63 / (42 + 21) = 63 / 63 = 1.0
    let vel = compute_velocity(citations, age);
    assert!((vel - 1.0).abs() < 1e-6);

    // smoothing constant test with 0 days age
    let vel_zero_age = compute_velocity(21, 0);
    // 21 / (0 + 21) = 1.0
    assert!((vel_zero_age - 1.0).abs() < 1e-6);
}

#[test]
fn test_notability_tiers() {
    let t1 = vec!["Systematic Review".to_string()];
    assert_eq!(notability_tier(&t1), Some((1, "Systematic Review")));

    let t2 = vec!["Randomized Controlled Trial".to_string()];
    assert_eq!(
        notability_tier(&t2),
        Some((2, "Randomized Controlled Trial"))
    );

    let t3 = vec!["Clinical Trial, Phase II".to_string()];
    assert_eq!(notability_tier(&t3), Some((3, "Clinical Trial, Phase II")));

    // When multiple publication types match, select the lowest tier number (highest rank)
    let multi = vec![
        "Clinical Trial".to_string(),
        "Meta-Analysis".to_string(),
        "Journal Article".to_string(),
    ];
    assert_eq!(notability_tier(&multi), Some((1, "Meta-Analysis")));

    let untiered = vec!["Journal Article".to_string(), "Letter".to_string()];
    assert!(notability_tier(&untiered).is_none());
}

#[test]
fn test_window_slices() {
    let today = NaiveDate::from_ymd_opt(2025, 1, 1).unwrap();
    let slices_365 = window_slices(today, 365);
    // 365 / 90 ~ 4 slices
    assert_eq!(slices_365.len(), 4);
    assert_eq!(slices_365[0].1, "2025/01/01");

    let slices_60 = window_slices(today, 60);
    // 60 / 90 round = 1 slice
    assert_eq!(slices_60.len(), 1);
}

#[test]
fn test_rank_articles_modes() {
    let today = NaiveDate::from_ymd_opt(2024, 6, 1).unwrap();

    let article1 = ArticleSearchResultDto {
        pmid: "101".to_string(),
        title: "Paper 1".to_string(),
        abstract_text: None,
        authors: vec!["Author A".to_string()],
        journal: None,
        pub_date: Some("2024/05/01".to_string()), // 31 days old
        doi: None,
        publication_types: vec!["Meta-Analysis".to_string()],
    };

    let article2 = ArticleSearchResultDto {
        pmid: "102".to_string(),
        title: "Paper 2".to_string(),
        abstract_text: None,
        authors: vec!["Author B".to_string()],
        journal: None,
        pub_date: Some("2024/01/01".to_string()), // 152 days old
        doi: None,
        publication_types: vec!["Journal Article".to_string()],
    };

    let article3_zero_cites = ArticleSearchResultDto {
        pmid: "103".to_string(),
        title: "Paper 3".to_string(),
        abstract_text: None,
        authors: vec!["Author C".to_string()],
        journal: None,
        pub_date: Some("2024/05/15".to_string()), // 17 days old
        doi: None,
        publication_types: vec!["Randomized Controlled Trial".to_string()],
    };

    let mut citations = HashMap::new();
    citations.insert("101".to_string(), 10);
    citations.insert("102".to_string(), 100);
    // 103 has 0 citations

    let pool = vec![article1, article2, article3_zero_cites];

    // 1. Trending mode: velocity sorted DESC, excludes 0 citations
    let trending = rank_articles(pool.clone(), &citations, today, "trending");
    assert_eq!(trending.len(), 2);
    // Paper 2 velocity = 100 / (152 + 21) = 100 / 173 = ~0.578
    // Paper 1 velocity = 10 / (31 + 21) = 10 / 52 = ~0.192
    assert_eq!(trending[0].pmid, "102");
    assert_eq!(trending[1].pmid, "101");

    // 2. Most Cited mode: raw citations sorted DESC, excludes 0 citations
    let most_cited = rank_articles(pool.clone(), &citations, today, "most_cited");
    assert_eq!(most_cited.len(), 2);
    assert_eq!(most_cited[0].pmid, "102");
    assert_eq!(most_cited[0].citation_count, 100);
    assert_eq!(most_cited[1].pmid, "101");
    assert_eq!(most_cited[1].citation_count, 10);

    // 3. New & Notable mode: INCLUDES 0-citation articles, sorted by evidence tier then age
    let notable = rank_articles(pool, &citations, today, "new_notable");
    assert_eq!(notable.len(), 3);
    // Paper 1 is Tier 1 (Meta-Analysis) -> index 0
    assert_eq!(notable[0].pmid, "101");
    assert_eq!(notable[0].notable_type.as_deref(), Some("Meta-Analysis"));
    // Paper 3 is Tier 2 (RCT) -> index 1 (even with 0 citations!)
    assert_eq!(notable[1].pmid, "103");
    assert_eq!(
        notable[1].notable_type.as_deref(),
        Some("Randomized Controlled Trial")
    );
    // Paper 2 is Untiered (Tier 99) -> index 2
    assert_eq!(notable[2].pmid, "102");
    assert_eq!(notable[2].notable_type, None);
}

#[tokio::test]
async fn test_trending_validation_errors() {
    let app = setup_test_app().await;

    // 1. Invalid specialty -> 422
    let req = Request::builder()
        .uri("/api/trending?specialty=nonexistent_specialty")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);

    let body = res.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert!(json["detail"]
        .as_str()
        .unwrap()
        .contains("Unknown specialty"));

    // 2. Invalid window_days -> 422
    let req = Request::builder()
        .uri("/api/trending?specialty=cardiology&window_days=999")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);

    // 3. Invalid mode -> 422
    let req = Request::builder()
        .uri("/api/trending?specialty=cardiology&mode=invalid_mode")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[tokio::test]
async fn test_trending_availability_endpoint() {
    let app = setup_test_app().await;

    let req = Request::builder()
        .uri("/api/trending/availability?window_days=365&mode=trending")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let body = res.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["window_days"], 365);
    assert_eq!(json["mode"], "trending");
    assert!(json["available"].is_object());
}

#[tokio::test]
async fn test_trending_snapshot_persistence_and_serving() {
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

    let test_specialty = "cardiology";
    let test_window = 365;
    let test_mode = "trending";

    // Clean up previous test snapshots for this combo
    sqlx::query(
        "DELETE FROM trending_snapshots WHERE specialty = $1 AND window_days = $2 AND mode = $3",
    )
    .bind(test_specialty)
    .bind(test_window)
    .bind(test_mode)
    .execute(&pool)
    .await
    .unwrap();

    let mock_articles = vec![
        TrendingArticle {
            pmid: "990001".to_string(),
            title: "Cardio Breakthrough".to_string(),
            abstract_text: Some("Cardiology abstract".to_string()),
            authors: vec!["Heart Doctor".to_string()],
            journal: Some("Circulation".to_string()),
            pub_date: Some("2024/01/01".to_string()),
            doi: Some("10.1001/cardio.1".to_string()),
            publication_types: vec!["Randomized Controlled Trial".to_string()],
            citation_count: 50,
            velocity: 0.85,
            notable_type: None,
            rank_delta: None,
            is_new: false,
            age_days: 60,
        },
        TrendingArticle {
            pmid: "990002".to_string(),
            title: "Heart Surgery Review".to_string(),
            abstract_text: Some("Review abstract".to_string()),
            authors: vec!["Surgeon Smith".to_string()],
            journal: Some("JACC".to_string()),
            pub_date: Some("2024/02/01".to_string()),
            doi: Some("10.1001/cardio.2".to_string()),
            publication_types: vec!["Systematic Review".to_string()],
            citation_count: 35,
            velocity: 0.65,
            notable_type: None,
            rank_delta: None,
            is_new: false,
            age_days: 30,
        },
    ];

    // Seed a baseline snapshot
    sqlx::query(
        r#"
        INSERT INTO trending_snapshots (specialty, mode, window_days, computed_at, payload)
        VALUES ($1, $2, $3, NOW(), $4)
        "#,
    )
    .bind(test_specialty)
    .bind(test_mode)
    .bind(test_window)
    .bind(sqlx::types::Json(&mock_articles))
    .execute(&pool)
    .await
    .unwrap();

    let app = setup_test_app().await;

    let req = Request::builder()
        .uri(format!(
            "/api/trending?specialty={}&window_days={}&mode={}",
            test_specialty, test_window, test_mode
        ))
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let res = app.clone().oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let body = res.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["specialty"], test_specialty);
    assert_eq!(json["mode"], test_mode);
    assert_eq!(json["window_days"], test_window);
    assert_eq!(json["has_rank_history"], false); // Only 1 snapshot inserted so no prior history

    let results = json["results"].as_array().unwrap();
    assert_eq!(results.len(), 2);
    assert_eq!(results[0]["pmid"], "990001");
    assert_eq!(results[0]["citation_count"], 50);
    // abstract_text is renamed to abstract in JSON representation to match React TS contract
    assert_eq!(results[0]["abstract"], "Cardiology abstract");

    // Now seed a SECOND snapshot with swapped ranks to verify rank movements!
    let updated_articles = vec![
        mock_articles[1].clone(), // 990002 moved up from index 1 to index 0 (+1)
        mock_articles[0].clone(), // 990001 moved down from index 0 to index 1 (-1)
    ];

    sqlx::query(
        r#"
        INSERT INTO trending_snapshots (specialty, mode, window_days, computed_at, payload)
        VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour', $4)
        "#,
    )
    .bind(test_specialty)
    .bind(test_mode)
    .bind(test_window)
    .bind(sqlx::types::Json(&updated_articles))
    .execute(&pool)
    .await
    .unwrap();

    let req2 = Request::builder()
        .uri(format!(
            "/api/trending?specialty={}&window_days={}&mode={}",
            test_specialty, test_window, test_mode
        ))
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let res2 = app.clone().oneshot(req2).await.unwrap();
    assert_eq!(res2.status(), StatusCode::OK);

    let body2 = res2.into_body().collect().await.unwrap().to_bytes();
    let json2: Value = serde_json::from_slice(&body2).unwrap();

    assert_eq!(json2["has_rank_history"], true);
    let results2 = json2["results"].as_array().unwrap();
    assert_eq!(results2[0]["pmid"], "990002");
    assert_eq!(results2[0]["rank_delta"], 1); // 1 - 0 = +1
    assert_eq!(results2[0]["is_new"], false);

    assert_eq!(results2[1]["pmid"], "990001");
    assert_eq!(results2[1]["rank_delta"], -1); // 0 - 1 = -1
    assert_eq!(results2[1]["is_new"], false);
}
