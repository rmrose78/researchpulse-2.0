use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::Value;
use sqlx::postgres::PgPoolOptions;
use tower::ServiceExt;

use researchpulse::rate_limiter::TokenBucketRateLimiter;
use researchpulse::services::entrez::{parse_efetch_xml, parse_esearch_xml};

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
async fn test_empty_query_returns_zero_results() {
    let app = setup_app().await;

    let req = Request::builder()
        .uri("/api/search?q=")
        .method("GET")
        .body(Body::empty())
        .unwrap();

    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let body = res.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["total"], 0);
    assert_eq!(json["results"].as_array().unwrap().len(), 0);
    assert_eq!(json["query"], "");
}

#[test]
fn test_esearch_xml_parsing() {
    let sample_xml = r#"
    <eSearchResult>
        <Count>1420</Count>
        <RetMax>2</RetMax>
        <RetStart>0</RetStart>
        <IdList>
            <Id>38491029</Id>
            <Id>38491030</Id>
        </IdList>
    </eSearchResult>
    "#;

    let (total, pmids) = parse_esearch_xml(sample_xml).expect("XML should parse cleanly");
    assert_eq!(total, 1420);
    assert_eq!(pmids, vec!["38491029", "38491030"]);
}

#[test]
fn test_efetch_xml_parsing() {
    let sample_xml = r#"
    <PubmedArticleSet>
        <PubmedArticle>
            <MedlineCitation>
                <PMID>38491029</PMID>
                <Article>
                    <Journal>
                        <JournalIssue>
                            <PubDate>
                                <Year>2024</Year>
                                <Month>03</Month>
                            </PubDate>
                        </JournalIssue>
                        <Title>Nature Medicine</Title>
                    </Journal>
                    <ArticleTitle>Advances in CAR-T Cell Therapy</ArticleTitle>
                    <Abstract>
                        <AbstractText>Chimeric antigen receptor T cell immunotherapy shows high efficacy.</AbstractText>
                    </Abstract>
                    <AuthorList>
                        <Author>
                            <LastName>Smith</LastName>
                            <ForeName>John</ForeName>
                        </Author>
                        <Author>
                            <LastName>Doe</LastName>
                            <ForeName>Jane</ForeName>
                        </Author>
                    </AuthorList>
                    <PublicationTypeList>
                        <PublicationType>Journal Article</PublicationType>
                        <PublicationType>Review</PublicationType>
                    </PublicationTypeList>
                </Article>
            </MedlineCitation>
            <PubmedData>
                <ArticleIdList>
                    <ArticleId IdType="pubmed">38491029</ArticleId>
                    <ArticleId IdType="doi">10.1038/s41591-024-001</ArticleId>
                </ArticleIdList>
            </PubmedData>
        </PubmedArticle>
    </PubmedArticleSet>
    "#;

    let articles = parse_efetch_xml(sample_xml).expect("XML should parse cleanly");
    assert_eq!(articles.len(), 1);

    let article = &articles[0];
    assert_eq!(article.pmid, "38491029");
    assert_eq!(article.title, "Advances in CAR-T Cell Therapy");
    assert_eq!(
        article.abstract_text.as_deref(),
        Some("Chimeric antigen receptor T cell immunotherapy shows high efficacy.")
    );
    assert_eq!(
        article.authors,
        vec!["Smith, John".to_string(), "Doe, Jane".to_string()]
    );
    assert_eq!(article.journal.as_deref(), Some("Nature Medicine"));
    assert_eq!(article.pub_date.as_deref(), Some("2024/03"));
    assert_eq!(article.doi.as_deref(), Some("10.1038/s41591-024-001"));
    assert_eq!(
        article.publication_types,
        vec!["Journal Article".to_string(), "Review".to_string()]
    );
}

#[tokio::test]
async fn test_rate_limiter_acquire() {
    let limiter = TokenBucketRateLimiter::new(3.0, 3.0);
    // Should immediately acquire up to initial capacity
    limiter.acquire().await;
    limiter.acquire().await;
    limiter.acquire().await;
}
