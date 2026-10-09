use chrono::{DateTime, Datelike, Duration, NaiveDate, Utc};
use sqlx::PgPool;

use crate::models::analytics::{AnalyticsSummary, BucketSummary, PathCount, ReferrerCount};

pub const DIRECT_REFERRER_LABEL: &str = "Direct";
pub const TOP_N: i64 = 5;

pub async fn record_pageview(
    pool: &PgPool,
    path: &str,
    referrer: Option<&str>,
) -> Result<(), sqlx::Error> {
    let clean_ref = referrer.map(|r| r.trim()).filter(|r| !r.is_empty());

    sqlx::query(
        r#"
        INSERT INTO page_views (path, referrer, viewed_at)
        VALUES ($1, $2, NOW())
        "#,
    )
    .bind(path)
    .bind(clean_ref)
    .execute(pool)
    .await?;

    Ok(())
}

pub fn bucket_start(now: DateTime<Utc>, bucket: &str) -> Option<DateTime<Utc>> {
    let today_date = now.date_naive();
    let start_of_today = today_date
        .and_hms_opt(0, 0, 0)?
        .and_local_timezone(Utc)
        .single()?;

    match bucket {
        "today" => Some(start_of_today),
        "this_week" => {
            let days_since_mon = today_date.weekday().num_days_from_monday() as i64;
            Some(start_of_today - Duration::days(days_since_mon))
        }
        "this_month" => {
            let start_of_month = NaiveDate::from_ymd_opt(today_date.year(), today_date.month(), 1)?
                .and_hms_opt(0, 0, 0)?
                .and_local_timezone(Utc)
                .single()?;
            Some(start_of_month)
        }
        "this_year" => {
            let start_of_year = NaiveDate::from_ymd_opt(today_date.year(), 1, 1)?
                .and_hms_opt(0, 0, 0)?
                .and_local_timezone(Utc)
                .single()?;
            Some(start_of_year)
        }
        _ => None, // "all_time"
    }
}

pub async fn bucket_summary(
    pool: &PgPool,
    start: Option<DateTime<Utc>>,
) -> Result<BucketSummary, sqlx::Error> {
    let (total_views, top_paths, top_referrers) = match start {
        Some(t) => {
            let count_row: (i64,) =
                sqlx::query_as("SELECT COUNT(*) FROM page_views WHERE viewed_at >= $1")
                    .bind(t)
                    .fetch_one(pool)
                    .await?;

            let paths = sqlx::query_as::<_, PathCount>(
                r#"
                SELECT path, COUNT(*) as count
                FROM page_views
                WHERE viewed_at >= $1
                GROUP BY path
                ORDER BY count DESC
                LIMIT $2
                "#,
            )
            .bind(t)
            .bind(TOP_N)
            .fetch_all(pool)
            .await?;

            let referrers = sqlx::query_as::<_, ReferrerCount>(
                r#"
                SELECT COALESCE(NULLIF(referrer, ''), 'Direct') as referrer, COUNT(*) as count
                FROM page_views
                WHERE viewed_at >= $1
                GROUP BY 1
                ORDER BY count DESC
                LIMIT $2
                "#,
            )
            .bind(t)
            .bind(TOP_N)
            .fetch_all(pool)
            .await?;

            (count_row.0, paths, referrers)
        }
        None => {
            let count_row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM page_views")
                .fetch_one(pool)
                .await?;

            let paths = sqlx::query_as::<_, PathCount>(
                r#"
                SELECT path, COUNT(*) as count
                FROM page_views
                GROUP BY path
                ORDER BY count DESC
                LIMIT $1
                "#,
            )
            .bind(TOP_N)
            .fetch_all(pool)
            .await?;

            let referrers = sqlx::query_as::<_, ReferrerCount>(
                r#"
                SELECT COALESCE(NULLIF(referrer, ''), 'Direct') as referrer, COUNT(*) as count
                FROM page_views
                GROUP BY 1
                ORDER BY count DESC
                LIMIT $1
                "#,
            )
            .bind(TOP_N)
            .fetch_all(pool)
            .await?;

            (count_row.0, paths, referrers)
        }
    };

    Ok(BucketSummary {
        total_views,
        top_paths,
        top_referrers,
    })
}

pub async fn get_summary(pool: &PgPool) -> Result<AnalyticsSummary, sqlx::Error> {
    let now = Utc::now();
    let today = bucket_summary(pool, bucket_start(now, "today")).await?;
    let this_week = bucket_summary(pool, bucket_start(now, "this_week")).await?;
    let this_month = bucket_summary(pool, bucket_start(now, "this_month")).await?;
    let this_year = bucket_summary(pool, bucket_start(now, "this_year")).await?;
    let all_time = bucket_summary(pool, None).await?;

    Ok(AnalyticsSummary {
        today,
        this_week,
        this_month,
        this_year,
        all_time,
    })
}
