use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ArticleSearchResult {
    pub pmid: String,
    pub title: String,
    pub abstract_text: Option<String>,
    pub authors: Vec<String>,
    pub journal: Option<String>,
    pub pub_date: Option<String>,
    pub doi: Option<String>,
    pub publication_types: Vec<String>,
}

// Rename abstract_text to abstract in JSON serialization to match frontend TypeScript contract exactly
impl ArticleSearchResult {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        pmid: String,
        title: String,
        abstract_text: Option<String>,
        authors: Vec<String>,
        journal: Option<String>,
        pub_date: Option<String>,
        doi: Option<String>,
        publication_types: Vec<String>,
    ) -> Self {
        Self {
            pmid,
            title,
            abstract_text,
            authors,
            journal,
            pub_date,
            doi,
            publication_types,
        }
    }
}

// Custom serde to map "abstract_text" field to "abstract" in JSON output
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ArticleSearchResultDto {
    pub pmid: String,
    pub title: String,
    #[serde(rename = "abstract")]
    pub abstract_text: Option<String>,
    pub authors: Vec<String>,
    pub journal: Option<String>,
    pub pub_date: Option<String>,
    pub doi: Option<String>,
    pub publication_types: Vec<String>,
}

impl From<ArticleSearchResult> for ArticleSearchResultDto {
    fn from(a: ArticleSearchResult) -> Self {
        Self {
            pmid: a.pmid,
            title: a.title,
            abstract_text: a.abstract_text,
            authors: a.authors,
            journal: a.journal,
            pub_date: a.pub_date,
            doi: a.doi,
            publication_types: a.publication_types,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SearchResponse {
    pub total: usize,
    pub results: Vec<ArticleSearchResultDto>,
    pub query: String,
}

#[derive(Debug, Deserialize)]
pub struct SearchQueryParams {
    pub q: String,
    pub max_results: Option<usize>,
    pub offset: Option<usize>,
    pub journal: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}
