import { useEffect, useRef } from 'react'
import type { ArticleSearchResult } from '@/types'
import type { SearchStatus } from '@/hooks/use-search'
import ArticleList from '../article-list/article-list'
import SearchSkeleton from '../search-skeleton/search-skeleton'
import EmptyState from '../empty-state/empty-state'
import ErrorState from '../error-state/error-state'
import LoadMore from '../load-more/load-more'
import styles from './search-results.module.scss'

interface SearchResultsProps {
  status: SearchStatus
  results: ArticleSearchResult[]
  query: string
  onBack: () => void
  onRetry: () => void
  total: number
  hasMore: boolean
  isLoadingMore: boolean
  loadMoreError: string | null
  onLoadMore: () => void
}

export default function SearchResults({
  status,
  results,
  query,
  onBack,
  onRetry,
  total,
  hasMore,
  isLoadingMore,
  loadMoreError,
  onLoadMore,
}: SearchResultsProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <section className={styles.section} aria-labelledby="results-heading">
      <div className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          ← New Search
        </button>
        <h2 id="results-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>
          Results for '{query}'
        </h2>
      </div>
      {status === 'success' && (
        <p className={styles.resultCount}>
          {total.toLocaleString()} {total === 1 ? 'result' : 'results'}
        </p>
      )}
      <div aria-live="polite">
        {status === 'loading' && <SearchSkeleton />}
        {status === 'success' && <ArticleList articles={results} />}
        {status === 'empty' && <EmptyState query={query} />}
        {status === 'error' && <ErrorState onRetry={onRetry} />}
      </div>
      {status === 'success' && (
        <LoadMore
          total={total}
          loadedCount={results.length}
          hasMore={hasMore}
          isLoading={isLoadingMore}
          error={loadMoreError}
          onLoadMore={onLoadMore}
        />
      )}
    </section>
  )
}
