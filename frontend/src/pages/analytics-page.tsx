import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getAnalyticsSummary } from '@/utils/api'
import { isAnalyticsExcluded, setAnalyticsExcluded } from '@/utils/analytics-exclusion'
import ErrorState from '@/components/sections/error-state/error-state'
import type { AnalyticsBucket, AnalyticsSummary } from '@/types'
import styles from './analytics-page.module.scss'

type Status = 'loading' | 'error' | 'success'

const BUCKETS: { key: keyof AnalyticsSummary; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'this_year', label: 'This Year' },
  { key: 'all_time', label: 'All Time' },
]

interface BucketSectionProps {
  label: string
  bucket: AnalyticsBucket
}

function BucketSection({ label, bucket }: BucketSectionProps) {
  return (
    <section className={styles.bucket} aria-labelledby={`bucket-${label}`}>
      <h2 id={`bucket-${label}`} className={styles.bucketHeading}>
        {label}
      </h2>
      <p className={styles.totalViews}>
        {bucket.total_views} {bucket.total_views === 1 ? 'view' : 'views'}
      </p>

      <div className={styles.columns}>
        <div>
          <h3 className={styles.columnHeading}>Top Pages</h3>
          {bucket.top_paths.length === 0 ? (
            <p className={styles.empty}>No views yet.</p>
          ) : (
            <ul className={styles.list}>
              {bucket.top_paths.map((entry) => (
                <li key={entry.path} className={styles.listItem}>
                  <span>{entry.path}</span>
                  <span>{entry.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className={styles.columnHeading}>Top Referrers</h3>
          {bucket.top_referrers.length === 0 ? (
            <p className={styles.empty}>No views yet.</p>
          ) : (
            <ul className={styles.list}>
              {bucket.top_referrers.map((entry) => (
                <li key={entry.referrer} className={styles.listItem}>
                  <span>{entry.referrer}</span>
                  <span>{entry.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

export default function AnalyticsPage() {
  const [searchParams] = useSearchParams()
  const key = searchParams.get('key') ?? ''

  const [status, setStatus] = useState<Status>('loading')
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [excluded, setExcluded] = useState(() => isAnalyticsExcluded())

  const fetchSummary = useCallback(() => {
    setStatus('loading')
    getAnalyticsSummary(key)
      .then((response) => {
        setSummary(response)
        setStatus('success')
      })
      .catch(() => {
        setStatus('error')
      })
  }, [key])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  function handleToggleExcluded() {
    const next = !excluded
    setAnalyticsExcluded(next)
    setExcluded(next)
  }

  return (
    <section className={styles.section} aria-labelledby="analytics-heading">
      <h1 id="analytics-heading" className={styles.heading}>
        Site Analytics
      </h1>

      <button type="button" className={styles.excludeToggle} onClick={handleToggleExcluded}>
        {excluded
          ? 'This browser is excluded from counts — click to include it'
          : 'Exclude this browser from counts'}
      </button>

      <div aria-live="polite">
        {status === 'loading' && <p role="status">Loading analytics…</p>}
        {status === 'error' && <ErrorState onRetry={fetchSummary} />}
        {status === 'success' && summary && (
          <div className={styles.buckets}>
            {BUCKETS.map(({ key: bucketKey, label }) => (
              <BucketSection key={bucketKey} label={label} bucket={summary[bucketKey]} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
