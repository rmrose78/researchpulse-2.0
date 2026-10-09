use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TrendingArticle {
    pub pmid: String,
    pub title: String,
    #[serde(rename = "abstract")]
    pub abstract_text: Option<String>,
    pub authors: Vec<String>,
    pub journal: Option<String>,
    pub pub_date: Option<String>,
    pub doi: Option<String>,
    pub publication_types: Vec<String>,
    pub citation_count: i64,
    pub velocity: f64,
    pub notable_type: Option<String>,
    pub rank_delta: Option<i64>,
    pub is_new: bool,
    pub age_days: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TrendingResponse {
    pub specialty: String,
    pub mode: String,
    pub window_days: i32,
    pub computed_at: DateTime<Utc>,
    pub has_rank_history: bool,
    pub results: Vec<TrendingArticle>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TrendingAvailabilityResponse {
    pub window_days: i32,
    pub mode: String,
    pub available: HashMap<String, bool>,
}

#[derive(Debug, Deserialize)]
pub struct TrendingQueryParams {
    pub specialty: String,
    pub window_days: Option<i32>,
    pub mode: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TrendingAvailabilityQueryParams {
    pub window_days: Option<i32>,
    pub mode: Option<String>,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct TrendingSnapshotRow {
    pub id: i32,
    pub specialty: String,
    pub mode: String,
    pub window_days: i32,
    pub computed_at: DateTime<Utc>,
    pub payload: sqlx::types::Json<Vec<TrendingArticle>>,
}
