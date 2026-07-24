import styles from './load-more.module.scss'

interface LoadMoreProps {
  total: number
  loadedCount: number
  hasMore: boolean
  isLoading: boolean
  error: string | null
  onLoadMore: () => void
}

export default function LoadMore({
  total,
  loadedCount,
  hasMore,
  isLoading,
  error,
  onLoadMore,
}: LoadMoreProps) {
  if (total === 0) return null

  return (
    <div className={styles.footer}>
      <div aria-live="polite" className={styles.liveRegion}>
        <p className={styles.progress}>
          Showing {loadedCount.toLocaleString()} of {total.toLocaleString()} results
        </p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}{' '}
            <button type="button" className={styles.retryButton} onClick={onLoadMore}>
              Try again
            </button>
          </p>
        ) : (
          hasMore && (
            <button
              type="button"
              className={styles.loadMoreButton}
              onClick={onLoadMore}
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  Loading more results…
                </>
              ) : (
                'Load more'
              )}
            </button>
          )
        )}
      </div>
    </div>
  )
}
