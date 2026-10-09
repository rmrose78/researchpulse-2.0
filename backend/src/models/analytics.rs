use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
pub struct PageViewCreate {
    pub path: String,
    pub referrer: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::FromRow)]
pub struct PathCount {
    pub path: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::FromRow)]
pub struct ReferrerCount {
    pub referrer: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BucketSummary {
    pub total_views: i64,
    pub top_paths: Vec<PathCount>,
    pub top_referrers: Vec<ReferrerCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AnalyticsSummary {
    pub today: BucketSummary,
    pub this_week: BucketSummary,
    pub this_month: BucketSummary,
    pub this_year: BucketSummary,
    pub all_time: BucketSummary,
}

#[derive(Debug, Deserialize)]
pub struct AnalyticsQueryParams {
    pub key: Option<String>,
}
