use reqwest::Client;
use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use std::time::Duration;
use tracing::{debug, warn};

const BATCH_SIZE: usize = 200;

#[derive(Clone, Debug)]
pub struct SemanticScholarClient {
    base_url: String,
    api_key: Option<String>,
    client: Client,
}

#[derive(Debug, Deserialize)]
struct SemanticScholarPaper {
    #[serde(rename = "externalIds")]
    external_ids: Option<ExternalIds>,
    #[serde(rename = "citationCount")]
    citation_count: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct ExternalIds {
    #[serde(rename = "PubMed")]
    pubmed: Option<String>,
}

impl SemanticScholarClient {
    pub fn new(base_url: String, api_key: Option<String>) -> Self {
        let client = Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(15))
            .build()
            .expect("Failed to create reqwest client for Semantic Scholar");

        Self {
            base_url,
            api_key,
            client,
        }
    }

    pub fn with_client(base_url: String, api_key: Option<String>, client: Client) -> Self {
        Self {
            base_url,
            api_key,
            client,
        }
    }

    pub async fn get_citation_counts(
        &self,
        pmids: &[String],
    ) -> Result<HashMap<String, i64>, reqwest::Error> {
        let valid_pmids: Vec<&str> = pmids
            .iter()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .collect();

        if valid_pmids.is_empty() {
            return Ok(HashMap::new());
        }

        let mut all_citations = HashMap::new();

        // Batch into chunks of up to 200
        for chunk in valid_pmids.chunks(BATCH_SIZE) {
            let chunk_counts = self.fetch_batch(chunk).await?;
            all_citations.extend(chunk_counts);
        }

        Ok(all_citations)
    }

    async fn fetch_batch(&self, pmids: &[&str]) -> Result<HashMap<String, i64>, reqwest::Error> {
        let ids: Vec<String> = pmids.iter().map(|pmid| format!("PMID:{}", pmid)).collect();

        let url = format!("{}/graph/v1/paper/batch", self.base_url);
        let mut req = self
            .client
            .post(&url)
            .query(&[("fields", "externalIds,citationCount")])
            .json(&json!({ "ids": ids }));

        if let Some(ref key) = self.api_key {
            req = req.header("x-api-key", key);
        }

        let resp = match req.send().await {
            Ok(r) => r,
            Err(e) => {
                warn!("Semantic Scholar request failed: {}", e);
                return Err(e);
            }
        };

        if resp.status() == reqwest::StatusCode::BAD_REQUEST {
            // Semantic Scholar returns 400 "No valid paper ids given" when none of the
            // batch IDs are known to its citation index yet. Return empty map safely.
            debug!("Semantic Scholar returned 400 Bad Request; returning empty citation map");
            return Ok(HashMap::new());
        }

        let resp = resp.error_for_status()?;
        let papers: Vec<Option<SemanticScholarPaper>> = resp.json().await?;

        let mut citations = HashMap::new();
        for paper in papers.into_iter().flatten() {
            if let Some(external_ids) = paper.external_ids {
                if let Some(pmid) = external_ids.pubmed {
                    citations.insert(pmid, paper.citation_count.unwrap_or(0));
                }
            }
        }

        Ok(citations)
    }
}
