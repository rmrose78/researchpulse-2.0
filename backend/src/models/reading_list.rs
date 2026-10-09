use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
pub struct SaveArticleRequest {
    pub pmid: String,
    pub title: String,
    #[serde(default)]
    pub authors: Vec<String>,
    pub journal: Option<String>,
    pub pub_date: Option<String>,
    pub doi: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone, PartialEq, Eq)]
pub struct SavedArticle {
    pub id: i32,
    pub pmid: String,
    pub title: String,
    pub authors: Option<String>,
    pub journal: Option<String>,
    pub pub_date: Option<String>,
    pub doi: Option<String>,
    pub saved_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReadingListCitationsResponse {
    pub citations: HashMap<String, i64>,
}
