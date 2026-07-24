import { useEffect, useMemo, useState } from 'react'
import { useReadingList } from '@/hooks/use-reading-list'
import ArticleList from '@/components/sections/article-list/article-list'
import SearchSkeleton from '@/components/sections/search-skeleton/search-skeleton'
import EmptyState from '@/components/sections/empty-state/empty-state'
import ErrorState from '@/components/sections/error-state/error-state'
import { getReadingListCitations } from '@/utils/api'
import type { ArticleSearchResult, CitationStat, SavedArticle } from '@/types'
import styles from './reading-list-page.module.scss'

// SavedArticle stores no abstract and joins authors into one string — convert
// back to ArticleSearchResult shape so ArticleList/ArticleCard can be reused as-is.
function toArticleSearchResult(saved: SavedArticle): ArticleSearchResult {
  return {
    pmid: saved.pmid,
    title: saved.title,
    abstract: null,
    authors: saved.authors ? saved.authors.split(', ') : [],
    journal: saved.journal,
    pub_date: saved.pub_date,
    doi: saved.doi,
    publication_types: [],
  }
}

export default function ReadingListPage() {
  const { status, articles, retry } = useReadingList()
  const results = useMemo(() => articles.map(toArticleSearchResult), [articles])

  const [citationCounts, setCitationCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (status !== 'success' || articles.length === 0) return
    let cancelled = false
    // Best-effort — a failed or slow Semantic Scholar batch call must never
    // block the reading list itself, so failures are swallowed silently.
    getReadingListCitations()
      .then((counts) => {
        if (!cancelled) setCitationCounts(counts)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [status, articles])

  const citationStats = useMemo(() => {
    const map: Record<string, CitationStat> = {}
    for (const article of articles) {
      const count = citationCounts[article.pmid]
      if (count !== undefined) map[article.pmid] = { count }
    }
    return map
  }, [articles, citationCounts])

  return (
    <section className={styles.section} aria-labelledby="reading-list-heading">
      <h1 id="reading-list-heading" className={styles.heading}>
        Reading List
      </h1>
      <p className={styles.subtitle}>Articles you've saved for later, kept up to date.</p>
      <div aria-live="polite">
        {status === 'loading' && <SearchSkeleton />}
        {status === 'success' && articles.length === 0 && (
          <EmptyState
            message="Your reading list is empty — save an article from search to see it here."
            actionLabel="Search PubMed"
            actionTo="/search"
          />
        )}
        {status === 'success' && articles.length > 0 && (
          <>
            <h2 className={styles.visuallyHidden}>Saved articles</h2>
            <p className={styles.count}>
              {articles.length} {articles.length === 1 ? 'saved article' : 'saved articles'}
            </p>
            <ArticleList articles={results} citationStats={citationStats} />
          </>
        )}
        {status === 'error' && <ErrorState onRetry={retry} />}
      </div>
    </section>
  )
}
