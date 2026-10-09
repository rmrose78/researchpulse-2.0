use chrono::{DateTime, Duration, NaiveDate, Utc};
use sqlx::PgPool;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{debug, error, info, warn};

use crate::models::article::ArticleSearchResultDto;
use crate::models::trending::{TrendingArticle, TrendingResponse, TrendingSnapshotRow};
use crate::services::entrez::EntrezClient;
use crate::services::semantic_scholar::SemanticScholarClient;
use crate::services::specialties::{
    build_query, is_valid_mode, is_valid_specialty, is_valid_window_days,
};

pub const POOL_SIZE: usize = 200;
pub const SLICE_LENGTH_DAYS: i64 = 90;
pub const VELOCITY_AGE_SMOOTHING_DAYS: i64 = 21;
pub const CACHE_TTL_HOURS: i64 = 8;
pub const UNTIERED_NOTABILITY: u32 = 99;

#[derive(Debug)]
pub enum TrendingError {
    UnknownSpecialty(String),
    InvalidWindow(i32),
    UnknownMode(String),
    Database(sqlx::Error),
    ExternalApi(String),
}

impl std::fmt::Display for TrendingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TrendingError::UnknownSpecialty(s) => write!(f, "Unknown specialty '{}'", s),
            TrendingError::InvalidWindow(w) => write!(f, "Unsupported window_days '{}'", w),
            TrendingError::UnknownMode(m) => write!(f, "Unsupported mode '{}'", m),
            TrendingError::Database(e) => write!(f, "Database error: {}", e),
            TrendingError::ExternalApi(e) => write!(f, "External API error: {}", e),
        }
    }
}

impl std::error::Error for TrendingError {}

impl From<sqlx::Error> for TrendingError {
    fn from(e: sqlx::Error) -> Self {
        TrendingError::Database(e)
    }
}

// Pure helper functions

pub fn parse_month(month_str: &str) -> Option<u32> {
    let s = month_str.trim();
    if let Ok(m) = s.parse::<u32>() {
        return if (1..=12).contains(&m) { Some(m) } else { None };
    }

    match s.to_lowercase().as_str() {
        "jan" | "january" => Some(1),
        "feb" | "february" => Some(2),
        "mar" | "march" => Some(3),
        "apr" | "april" => Some(4),
        "may" => Some(5),
        "jun" | "june" => Some(6),
        "jul" | "july" => Some(7),
        "aug" | "august" => Some(8),
        "sep" | "september" => Some(9),
        "oct" | "october" => Some(10),
        "nov" | "november" => Some(11),
        "dec" | "december" => Some(12),
        _ => None,
    }
}

pub fn parse_pub_date(pub_date: Option<&str>) -> Option<NaiveDate> {
    let date_str = pub_date?.trim();
    let parts: Vec<&str> = date_str.split('/').collect();
    if parts.len() < 2 {
        return None;
    }

    let year: i32 = parts[0].trim().parse().ok()?;
    let month = parse_month(parts[1])?;

    NaiveDate::from_ymd_opt(year, month, 1)
}

pub fn age_days(pub_date: Option<&str>, today: NaiveDate) -> Option<i64> {
    let parsed = parse_pub_date(pub_date)?;
    let days = (today - parsed).num_days();
    Some(days.max(0))
}

pub fn compute_velocity(citation_count: i64, age_in_days: i64) -> f64 {
    citation_count as f64 / (age_in_days + VELOCITY_AGE_SMOOTHING_DAYS) as f64
}

pub fn notability_tier(pub_types: &[String]) -> Option<(u32, &'static str)> {
    let mut best: Option<(u32, &'static str)> = None;

    for pt in pub_types {
        let matched = match pt.as_str() {
            "Meta-Analysis" => Some((1, "Meta-Analysis")),
            "Systematic Review" => Some((1, "Systematic Review")),
            "Randomized Controlled Trial" => Some((2, "Randomized Controlled Trial")),
            "Clinical Trial" => Some((3, "Clinical Trial")),
            "Clinical Trial, Phase I" => Some((3, "Clinical Trial, Phase I")),
            "Clinical Trial, Phase II" => Some((3, "Clinical Trial, Phase II")),
            "Clinical Trial, Phase III" => Some((3, "Clinical Trial, Phase III")),
            "Clinical Trial, Phase IV" => Some((3, "Clinical Trial, Phase IV")),
            "Multicenter Study" => Some((3, "Multicenter Study")),
            "Comparative Study" => Some((3, "Comparative Study")),
            _ => None,
        };

        if let Some((tier, label)) = matched {
            if best.is_none() || tier < best.unwrap().0 {
                best = Some((tier, label));
            }
        }
    }

    best
}

pub fn window_slices(today: NaiveDate, window_days: i32) -> Vec<(String, String)> {
    let num_slices = ((window_days as f64 / SLICE_LENGTH_DAYS as f64).round() as usize).max(1);
    let slice_length = window_days as f64 / num_slices as f64;
    let mut slices = Vec::with_capacity(num_slices);

    for i in 0..num_slices {
        let end_offset = (i as f64 * slice_length).round() as i64;
        let start_offset = ((i + 1) as f64 * slice_length).round() as i64;
        let date_to = (today - Duration::days(end_offset))
            .format("%Y/%m/%d")
            .to_string();
        let date_from = (today - Duration::days(start_offset))
            .format("%Y/%m/%d")
            .to_string();
        slices.push((date_from, date_to));
    }

    slices
}

pub fn rank_articles(
    articles: Vec<ArticleSearchResultDto>,
    citation_counts: &HashMap<String, i64>,
    today: NaiveDate,
    mode: &str,
) -> Vec<TrendingArticle> {
    let mut ranked = Vec::new();

    for article in articles {
        let count = citation_counts.get(&article.pmid).copied().unwrap_or(0);
        if count == 0 && mode != "new_notable" {
            continue;
        }

        let days = match age_days(article.pub_date.as_deref(), today) {
            Some(d) => d,
            None => continue,
        };

        let notable_type = if mode == "new_notable" {
            notability_tier(&article.publication_types).map(|(_, label)| label.to_string())
        } else {
            None
        };

        let velocity = compute_velocity(count, days);

        ranked.push(TrendingArticle {
            pmid: article.pmid,
            title: article.title,
            abstract_text: article.abstract_text,
            authors: article.authors,
            journal: article.journal,
            pub_date: article.pub_date,
            doi: article.doi,
            publication_types: article.publication_types,
            citation_count: count,
            velocity,
            notable_type,
            rank_delta: None,
            is_new: false,
            age_days: days,
        });
    }

    if mode == "most_cited" {
        ranked.sort_by_key(|a| std::cmp::Reverse(a.citation_count));
    } else if mode == "new_notable" {
        ranked.sort_by(|a, b| {
            let tier_a = notability_tier(&a.publication_types)
                .map(|(t, _)| t)
                .unwrap_or(UNTIERED_NOTABILITY);
            let tier_b = notability_tier(&b.publication_types)
                .map(|(t, _)| t)
                .unwrap_or(UNTIERED_NOTABILITY);
            tier_a
                .cmp(&tier_b)
                .then_with(|| a.age_days.cmp(&b.age_days))
        });
    } else {
        // default "trending": sort by velocity descending
        ranked.sort_by(|a, b| {
            b.velocity
                .partial_cmp(&a.velocity)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    }

    ranked
}

pub fn rank_movements(
    current: &[TrendingArticle],
    previous: Option<&[TrendingArticle]>,
) -> HashMap<String, (Option<i64>, bool)> {
    let mut movements = HashMap::new();
    let previous = match previous {
        Some(p) => p,
        None => return movements,
    };

    let previous_ranks: HashMap<&str, usize> = previous
        .iter()
        .enumerate()
        .map(|(idx, a)| (a.pmid.as_str(), idx))
        .collect();

    for (i, article) in current.iter().enumerate() {
        match previous_ranks.get(article.pmid.as_str()) {
            None => {
                movements.insert(article.pmid.clone(), (None, true));
            }
            Some(&prev_idx) => {
                let delta = prev_idx as i64 - i as i64;
                if delta != 0 {
                    movements.insert(article.pmid.clone(), (Some(delta), false));
                }
            }
        }
    }

    movements
}

pub fn attach_rank_movements(
    mut current: Vec<TrendingArticle>,
    previous: Option<&[TrendingArticle]>,
) -> Vec<TrendingArticle> {
    let movements = rank_movements(&current, previous);
    for article in &mut current {
        if let Some(&(delta, is_new)) = movements.get(&article.pmid) {
            article.rank_delta = delta;
            article.is_new = is_new;
        } else {
            article.rank_delta = None;
            article.is_new = false;
        }
    }
    current
}

pub fn is_stale(computed_at: DateTime<Utc>, now: DateTime<Utc>) -> bool {
    now - computed_at > Duration::hours(CACHE_TTL_HOURS)
}

// Database snapshot queries and engine

pub async fn get_latest_snapshot(
    pool: &PgPool,
    specialty: &str,
    window_days: i32,
    mode: &str,
) -> Result<Option<TrendingSnapshotRow>, sqlx::Error> {
    sqlx::query_as::<_, TrendingSnapshotRow>(
        r#"
        SELECT id, specialty, mode, window_days, computed_at, payload
        FROM trending_snapshots
        WHERE specialty = $1 AND mode = $2 AND window_days = $3
        ORDER BY computed_at DESC
        LIMIT 1
        "#,
    )
    .bind(specialty)
    .bind(mode)
    .bind(window_days)
    .fetch_optional(pool)
    .await
}

pub async fn get_previous_snapshot(
    pool: &PgPool,
    specialty: &str,
    window_days: i32,
    mode: &str,
    before: DateTime<Utc>,
) -> Result<Option<TrendingSnapshotRow>, sqlx::Error> {
    sqlx::query_as::<_, TrendingSnapshotRow>(
        r#"
        SELECT id, specialty, mode, window_days, computed_at, payload
        FROM trending_snapshots
        WHERE specialty = $1 AND mode = $2 AND window_days = $3 AND computed_at < $4
        ORDER BY computed_at DESC
        LIMIT 1
        "#,
    )
    .bind(specialty)
    .bind(mode)
    .bind(window_days)
    .bind(before)
    .fetch_optional(pool)
    .await
}

pub async fn list_cached_availability(
    pool: &PgPool,
    window_days: i32,
    mode: &str,
) -> Result<HashMap<String, bool>, sqlx::Error> {
    let rows = sqlx::query_as::<_, (String, serde_json::Value)>(
        r#"
        SELECT specialty, payload
        FROM trending_snapshots
        WHERE mode = $1 AND window_days = $2
        ORDER BY specialty, computed_at DESC
        "#,
    )
    .bind(mode)
    .bind(window_days)
    .fetch_all(pool)
    .await?;

    let mut availability = HashMap::new();
    for (specialty, payload) in rows {
        availability
            .entry(specialty)
            .or_insert_with(|| match payload {
                serde_json::Value::Array(arr) => !arr.is_empty(),
                _ => false,
            });
    }

    Ok(availability)
}

pub async fn fetch_raw_articles(
    entrez: &EntrezClient,
    specialty: &str,
    window_days: i32,
    mode: &str,
    today: NaiveDate,
) -> Result<Vec<ArticleSearchResultDto>, TrendingError> {
    let query = build_query(specialty, mode)
        .ok_or_else(|| TrendingError::UnknownSpecialty(specialty.to_string()))?;

    if mode == "new_notable" {
        let date_from = (today - Duration::days(window_days as i64))
            .format("%Y/%m/%d")
            .to_string();
        let date_to = today.format("%Y/%m/%d").to_string();

        let res = entrez
            .search(&query, POOL_SIZE, 0, None, Some(&date_from), Some(&date_to))
            .await
            .map_err(|e| TrendingError::ExternalApi(format!("Entrez search failed: {}", e)))?;
        Ok(res.results)
    } else {
        let slices = window_slices(today, window_days);
        let per_slice = (POOL_SIZE / slices.len()).max(1);

        let mut all_articles = Vec::new();
        let mut seen_pmids = HashSet::new();

        for (date_from, date_to) in slices {
            match entrez
                .search(&query, per_slice, 0, None, Some(&date_from), Some(&date_to))
                .await
            {
                Ok(res) => {
                    for article in res.results {
                        if seen_pmids.insert(article.pmid.clone()) {
                            all_articles.push(article);
                        }
                    }
                }
                Err(e) => {
                    warn!(
                        "Slice fetch error for {} [{}-{}]: {}",
                        specialty, date_from, date_to, e
                    );
                }
            }
        }

        Ok(all_articles)
    }
}

pub async fn compute_and_store(
    pool: &PgPool,
    entrez: &EntrezClient,
    semantic_scholar: &SemanticScholarClient,
    specialty: &str,
    window_days: i32,
    mode: &str,
) -> Result<TrendingSnapshotRow, TrendingError> {
    let today = Utc::now().date_naive();
    let articles = fetch_raw_articles(entrez, specialty, window_days, mode, today).await?;

    let pmids: Vec<String> = articles.iter().map(|a| a.pmid.clone()).collect();
    let citation_counts = semantic_scholar
        .get_citation_counts(&pmids)
        .await
        .map_err(|e| TrendingError::ExternalApi(format!("Semantic Scholar error: {}", e)))?;

    let ranked = rank_articles(articles, &citation_counts, today, mode);

    let row = sqlx::query_as::<_, TrendingSnapshotRow>(
        r#"
        INSERT INTO trending_snapshots (specialty, mode, window_days, computed_at, payload)
        VALUES ($1, $2, $3, NOW(), $4)
        RETURNING id, specialty, mode, window_days, computed_at, payload
        "#,
    )
    .bind(specialty)
    .bind(mode)
    .bind(window_days)
    .bind(sqlx::types::Json(&ranked))
    .fetch_one(pool)
    .await?;

    info!(
        "Computed and stored trending snapshot for {} ({}, {}d) with {} articles",
        specialty,
        mode,
        window_days,
        ranked.len()
    );

    Ok(row)
}

#[derive(Clone, Default)]
pub struct FlightLocks {
    locks: Arc<Mutex<HashMap<String, Arc<Mutex<()>>>>>,
}

impl FlightLocks {
    pub async fn get_lock(&self, key: &str) -> Arc<Mutex<()>> {
        let mut map = self.locks.lock().await;
        map.entry(key.to_string())
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone()
    }
}

pub async fn get_trending(
    pool: &PgPool,
    entrez: &Arc<EntrezClient>,
    semantic_scholar: &Arc<SemanticScholarClient>,
    flight_locks: &FlightLocks,
    specialty: &str,
    window_days: i32,
    mode: &str,
) -> Result<TrendingResponse, TrendingError> {
    if !is_valid_specialty(specialty) {
        return Err(TrendingError::UnknownSpecialty(specialty.to_string()));
    }
    if !is_valid_window_days(window_days) {
        return Err(TrendingError::InvalidWindow(window_days));
    }
    if !is_valid_mode(mode) {
        return Err(TrendingError::UnknownMode(mode.to_string()));
    }

    let latest = get_latest_snapshot(pool, specialty, window_days, mode).await?;

    let snapshot = match latest {
        Some(snap) => {
            if is_stale(snap.computed_at, Utc::now()) {
                debug!(
                    "Snapshot for {}:{}:{} is stale, spawning background refresh",
                    specialty, mode, window_days
                );
                let pool_clone = pool.clone();
                let entrez_clone = entrez.clone();
                let sem_clone = semantic_scholar.clone();
                let specialty_str = specialty.to_string();
                let mode_str = mode.to_string();
                let locks_clone = flight_locks.clone();

                tokio::spawn(async move {
                    let key = format!("{}:{}:{}", specialty_str, mode_str, window_days);
                    let lock = locks_clone.get_lock(&key).await;
                    if let Ok(_guard) = lock.try_lock_owned() {
                        if let Err(e) = compute_and_store(
                            &pool_clone,
                            &entrez_clone,
                            &sem_clone,
                            &specialty_str,
                            window_days,
                            &mode_str,
                        )
                        .await
                        {
                            error!("Background refresh failed for {}: {}", key, e);
                        }
                    }
                });
            }
            snap
        }
        None => {
            let key = format!("{}:{}:{}", specialty, mode, window_days);
            let lock = flight_locks.get_lock(&key).await;
            let _guard = lock.lock_owned().await;

            // Re-check in case another request computed it while waiting
            if let Some(snap) = get_latest_snapshot(pool, specialty, window_days, mode).await? {
                snap
            } else {
                compute_and_store(pool, entrez, semantic_scholar, specialty, window_days, mode)
                    .await?
            }
        }
    };

    let prev = get_previous_snapshot(
        pool,
        &snapshot.specialty,
        snapshot.window_days,
        &snapshot.mode,
        snapshot.computed_at,
    )
    .await?;

    let has_rank_history = prev.is_some();
    let prev_payload = prev.as_ref().map(|p| p.payload.0.as_slice());
    let results = attach_rank_movements(snapshot.payload.0, prev_payload);

    Ok(TrendingResponse {
        specialty: snapshot.specialty,
        mode: snapshot.mode,
        window_days: snapshot.window_days,
        computed_at: snapshot.computed_at,
        has_rank_history,
        results,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_month_and_pub_date() {
        assert_eq!(parse_month("1"), Some(1));
        assert_eq!(parse_month("12"), Some(12));
        assert_eq!(parse_month("0"), None);
        assert_eq!(parse_month("13"), None);
        assert_eq!(parse_month("Jan"), Some(1));
        assert_eq!(parse_month("May"), Some(5));
        assert_eq!(parse_month("December"), Some(12));
        assert_eq!(parse_month("Invalid"), None);

        let parsed = parse_pub_date(Some("2024/05/15")).unwrap();
        assert_eq!(parsed, NaiveDate::from_ymd_opt(2024, 5, 1).unwrap());

        let parsed_month_name = parse_pub_date(Some("2023/Oct")).unwrap();
        assert_eq!(
            parsed_month_name,
            NaiveDate::from_ymd_opt(2023, 10, 1).unwrap()
        );

        assert!(parse_pub_date(None).is_none());
        assert!(parse_pub_date(Some("invalid")).is_none());
    }

    #[test]
    fn test_age_days_and_velocity() {
        let today = NaiveDate::from_ymd_opt(2024, 6, 1).unwrap();
        let days = age_days(Some("2024/05/01"), today).unwrap();
        assert_eq!(days, 31);

        // Velocity = count / (days + 21)
        let vel = compute_velocity(52, days);
        // 52 / (31 + 21) = 52 / 52 = 1.0
        assert!((vel - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_notability_tier_hierarchy() {
        let meta = vec!["Journal Article".to_string(), "Meta-Analysis".to_string()];
        let (tier, label) = notability_tier(&meta).unwrap();
        assert_eq!(tier, 1);
        assert_eq!(label, "Meta-Analysis");

        let rct = vec![
            "Randomized Controlled Trial".to_string(),
            "Clinical Trial".to_string(),
        ];
        let (tier2, label2) = notability_tier(&rct).unwrap();
        assert_eq!(tier2, 2);
        assert_eq!(label2, "Randomized Controlled Trial");

        let clinical = vec!["Clinical Trial, Phase III".to_string()];
        let (tier3, label3) = notability_tier(&clinical).unwrap();
        assert_eq!(tier3, 3);
        assert_eq!(label3, "Clinical Trial, Phase III");

        let untiered = vec!["Case Reports".to_string(), "Editorial".to_string()];
        assert!(notability_tier(&untiered).is_none());
    }

    #[test]
    fn test_rank_movements_diffing() {
        let make_art = |pmid: &str| TrendingArticle {
            pmid: pmid.to_string(),
            title: format!("Title {}", pmid),
            abstract_text: None,
            authors: vec![],
            journal: None,
            pub_date: Some("2024/01/01".to_string()),
            doi: None,
            publication_types: vec![],
            citation_count: 10,
            velocity: 1.0,
            notable_type: None,
            rank_delta: None,
            is_new: false,
            age_days: 10,
        };

        // Previous ranks:
        // 0: A, 1: B, 2: C, 3: D
        let prev = vec![make_art("A"), make_art("B"), make_art("C"), make_art("D")];

        // Current ranks:
        // 0: C (was 2, moved up 2 ranks: +2)
        // 1: A (was 0, moved down 1 rank: -1)
        // 2: B (was 1, moved down 1 rank: -1)
        // 3: E (was not in prev: is_new = true, delta = None)
        let curr = vec![make_art("C"), make_art("A"), make_art("B"), make_art("E")];

        let results = attach_rank_movements(curr, Some(&prev));

        assert_eq!(results[0].pmid, "C");
        assert_eq!(results[0].rank_delta, Some(2));
        assert!(!results[0].is_new);

        assert_eq!(results[1].pmid, "A");
        assert_eq!(results[1].rank_delta, Some(-1));
        assert!(!results[1].is_new);

        assert_eq!(results[2].pmid, "B");
        assert_eq!(results[2].rank_delta, Some(-1));
        assert!(!results[2].is_new);

        assert_eq!(results[3].pmid, "E");
        assert_eq!(results[3].rank_delta, None);
        assert!(results[3].is_new);
    }
}
