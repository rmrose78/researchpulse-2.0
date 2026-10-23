use quick_xml::events::Event;
use quick_xml::reader::Reader;
use std::time::Duration;
use tracing::warn;

use crate::models::article::{ArticleSearchResult, ArticleSearchResultDto, SearchResponse};
use crate::rate_limiter::TokenBucketRateLimiter;

#[derive(Clone, Debug)]
pub struct EntrezClient {
    base_url: String,
    api_key: Option<String>,
    client: reqwest::Client,
    rate_limiter: TokenBucketRateLimiter,
}

impl EntrezClient {
    pub fn new(base_url: String, api_key: Option<String>) -> Self {
        let (capacity, refill_rate) = if api_key.is_some() {
            (10.0, 10.0)
        } else {
            (3.0, 3.0)
        };

        Self {
            base_url,
            api_key,
            client: reqwest::Client::builder()
                .no_proxy()
                .timeout(Duration::from_secs(15))
                .build()
                .unwrap_or_default(),
            rate_limiter: TokenBucketRateLimiter::new(capacity, refill_rate),
        }
    }

    pub async fn search(
        &self,
        query: &str,
        max_results: usize,
        offset: usize,
        journal: Option<&str>,
        date_from: Option<&str>,
        date_to: Option<&str>,
    ) -> Result<SearchResponse, String> {
        let mut full_query = query.to_string();
        if let Some(j) = journal {
            let j = j.trim();
            if !j.is_empty() {
                full_query.push_str(&format!(" AND \"{}\"[journal]", j));
            }
        }
        if let (Some(from), Some(to)) = (date_from, date_to) {
            let from = from.trim();
            let to = to.trim();
            if !from.is_empty() && !to.is_empty() {
                full_query.push_str(&format!(" AND {}:{}[Date - Publication]", from, to));
            }
        }

        // Step 1: esearch
        let esearch_url = format!("{}/esearch.fcgi", self.base_url);
        let mut esearch_params = vec![
            ("db", "pubmed".to_string()),
            ("term", full_query),
            ("retmax", max_results.to_string()),
            ("retstart", offset.to_string()),
            ("usehistory", "y".to_string()),
            ("retmode", "xml".to_string()),
        ];
        if let Some(key) = &self.api_key {
            esearch_params.push(("api_key", key.clone()));
        }

        let esearch_xml = self.get_with_retry(&esearch_url, &esearch_params).await?;
        let (total, pmids) = parse_esearch_xml(&esearch_xml)?;

        if pmids.is_empty() {
            return Ok(SearchResponse {
                total,
                results: Vec::new(),
                query: query.to_string(),
            });
        }

        // Step 2: efetch
        let efetch_url = format!("{}/efetch.fcgi", self.base_url);
        let mut efetch_params = vec![
            ("db", "pubmed".to_string()),
            ("id", pmids.join(",")),
            ("rettype", "abstract".to_string()),
            ("retmode", "xml".to_string()),
        ];
        if let Some(key) = &self.api_key {
            efetch_params.push(("api_key", key.clone()));
        }

        let efetch_xml = self.get_with_retry(&efetch_url, &efetch_params).await?;
        let articles = parse_efetch_xml(&efetch_xml)?;
        let results = articles
            .into_iter()
            .map(ArticleSearchResultDto::from)
            .collect();

        Ok(SearchResponse {
            total,
            results,
            query: query.to_string(),
        })
    }

    async fn get_with_retry(&self, url: &str, params: &[(&str, String)]) -> Result<String, String> {
        let max_attempts = 4;
        let mut delay = Duration::from_millis(500);

        for attempt in 1..=max_attempts {
            self.rate_limiter.acquire().await;

            let res = self
                .client
                .get(url)
                .query(params)
                .send()
                .await
                .map_err(|e| format!("HTTP request failed: {}", e))?;

            if res.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
                if attempt < max_attempts {
                    warn!(
                        "NCBI returned 429 Too Many Requests, backing off for {:?} (attempt {}/{})",
                        delay, attempt, max_attempts
                    );
                    tokio::time::sleep(delay).await;
                    delay *= 2;
                    continue;
                } else {
                    return Err("NCBI rate limit exceeded after retries".to_string());
                }
            }

            if !res.status().is_success() {
                return Err(format!("NCBI returned status {}", res.status()));
            }

            return res
                .text()
                .await
                .map_err(|e| format!("Failed to read body: {}", e));
        }

        Err("Max attempts reached".to_string())
    }
}

pub fn parse_esearch_xml(xml: &str) -> Result<(usize, Vec<String>), String> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut total = 0;
    let mut pmids = Vec::new();
    let mut current_tag = String::new();
    let mut in_count = false;
    let mut count_captured = false;

    let mut buf = Vec::new();
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if name == "Count" && !count_captured {
                    in_count = true;
                }
                current_tag = name;
            }
            Ok(Event::Text(ref e)) => {
                let text = e.unescape().map_err(|e| e.to_string())?.to_string();
                if in_count {
                    if let Ok(c) = text.parse::<usize>() {
                        total = c;
                        count_captured = true;
                    }
                    in_count = false;
                } else if current_tag == "Id" {
                    pmids.push(text);
                }
            }
            Ok(Event::End(_)) => {
                current_tag.clear();
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("XML parsing error: {}", e)),
            _ => (),
        }
        buf.clear();
    }

    Ok((total, pmids))
}

#[derive(Default)]
struct ArticleBuilder {
    pmid: String,
    title: String,
    abstract_text: Option<String>,
    authors: Vec<String>,
    journal: Option<String>,
    pub_date_year: Option<String>,
    pub_date_month: Option<String>,
    doi: Option<String>,
    publication_types: Vec<String>,
    current_last_name: Option<String>,
    current_fore_name: Option<String>,
}

impl ArticleBuilder {
    fn finish_author(&mut self) {
        if let Some(last) = self.current_last_name.take() {
            let full = if let Some(fore) = self.current_fore_name.take() {
                format!("{}, {}", last, fore)
            } else {
                last
            };
            self.authors.push(full);
        } else {
            self.current_fore_name = None;
        }
    }

    fn build(mut self) -> ArticleSearchResult {
        self.finish_author();

        let pub_date = match (self.pub_date_year, self.pub_date_month) {
            (Some(y), Some(m)) => Some(format!("{}/{}", y, m)),
            (Some(y), None) => Some(y),
            _ => None,
        };

        ArticleSearchResult::new(
            self.pmid,
            self.title,
            self.abstract_text,
            self.authors,
            self.journal,
            pub_date,
            self.doi,
            self.publication_types,
        )
    }
}

pub fn parse_efetch_xml(xml: &str) -> Result<Vec<ArticleSearchResult>, String> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut articles = Vec::new();
    let mut current_article: Option<ArticleBuilder> = None;
    let mut tag_stack: Vec<String> = Vec::new();
    let mut is_doi = false;

    let mut buf = Vec::new();
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if tag == "PubmedArticle" {
                    current_article = Some(ArticleBuilder::default());
                } else if tag == "Author" {
                    if let Some(ref mut art) = current_article {
                        art.finish_author();
                    }
                } else if tag == "ArticleId" {
                    is_doi = false;
                    for attr in e.attributes().flatten() {
                        if attr.key.as_ref() == b"IdType" && attr.value.as_ref() == b"doi" {
                            is_doi = true;
                        }
                    }
                }
                tag_stack.push(tag);
            }
            Ok(Event::End(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if tag == "PubmedArticle" {
                    if let Some(art) = current_article.take() {
                        articles.push(art.build());
                    }
                } else if tag == "Author" {
                    if let Some(ref mut art) = current_article {
                        art.finish_author();
                    }
                }
                tag_stack.pop();
            }
            Ok(Event::Text(ref e)) => {
                let text = e.unescape().map_err(|e| e.to_string())?.to_string();
                if let Some(ref mut art) = current_article {
                    let parent = tag_stack.last().map(|s| s.as_str()).unwrap_or("");
                    match parent {
                        "PMID" if art.pmid.is_empty() => {
                            art.pmid = text;
                        }
                        "ArticleTitle" => {
                            if art.title.is_empty() {
                                art.title = text;
                            } else {
                                art.title.push_str(&text);
                            }
                        }
                        "AbstractText" => {
                            if let Some(ref mut existing) = art.abstract_text {
                                existing.push(' ');
                                existing.push_str(&text);
                            } else {
                                art.abstract_text = Some(text);
                            }
                        }
                        "LastName" => {
                            art.current_last_name = Some(text);
                        }
                        "ForeName" => {
                            art.current_fore_name = Some(text);
                        }
                        "Title" if tag_stack.contains(&"Journal".to_string()) => {
                            art.journal = Some(text);
                        }
                        "Year" if tag_stack.contains(&"PubDate".to_string()) => {
                            art.pub_date_year = Some(text);
                        }
                        "Month" if tag_stack.contains(&"PubDate".to_string()) => {
                            art.pub_date_month = Some(text);
                        }
                        "PublicationType" => {
                            art.publication_types.push(text);
                        }
                        "ArticleId" if is_doi => {
                            art.doi = Some(text);
                        }
                        _ => {}
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("XML parse error: {}", e)),
            _ => (),
        }
        buf.clear();
    }

    Ok(articles)
}
