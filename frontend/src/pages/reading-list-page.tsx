import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Copy, Check, Search, TrendingUp, Share2 } from 'lucide-react'
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
  const [filterQuery, setFilterQuery] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (status !== 'success' || articles.length === 0) return
    let cancelled = false
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

  // Filter saved articles by search text
  const filteredResults = useMemo(() => {
    if (!filterQuery.trim()) return results
    const q = filterQuery.toLowerCase()
    return results.filter(
      (article) =>
        article.title.toLowerCase().includes(q) ||
        (article.journal && article.journal.toLowerCase().includes(q)) ||
        article.authors.some((author) => author.toLowerCase().includes(q))
    )
  }, [results, filterQuery])

  // Calculate total citations across saved papers
  const totalCitations = useMemo(() => {
    return Object.values(citationCounts).reduce((acc, curr) => acc + curr, 0)
  }, [citationCounts])

  function handleExportCitations() {
    if (articles.length === 0) return
    const text = articles
      .map(
        (a, i) =>
          `[${i + 1}] ${a.title}. ${a.authors}. ${a.journal ?? 'PubMed'} (${(a.pub_date ?? '').slice(0, 4)}). PMID: ${a.pmid}.`
      )
      .join('\n\n')

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      })
    }
  }


  return (
    <section className={styles.section} aria-labelledby="reading-list-heading">
      <div className={styles.headerGroup}>
        <div>
          <h1 id="reading-list-heading" className={styles.heading}>
            Reading List
          </h1>
          <p className={styles.subtitle}>Articles you've saved for later, kept up to date.</p>
        </div>
      </div>

      <div aria-live="polite">
        {status === 'loading' && <SearchSkeleton />}

        {status === 'success' && articles.length === 0 && (
          <div className={styles.emptyContainer}>
            <EmptyState
              message="Your reading list is empty — save an article from search to see it here."
              actionLabel="Search PubMed"
              actionTo="/search"
            />

            <div className={styles.secondaryActionRow}>
              <Link to="/" className={styles.secondaryLink}>
                <TrendingUp size={16} aria-hidden="true" />
                Browse Trending Articles
              </Link>
            </div>

            <div className={styles.emptyGuideGrid}>
              <div className={styles.guideCard}>
                <div className={styles.guideIconCircle}>
                  <Bookmark size={20} aria-hidden="true" />
                </div>
                <h2 className={styles.guideTitle}>Bookmark &amp; Organize</h2>
                <p className={styles.guideText}>
                  Save any article from PubMed search or trending rankings for quick offline reference.
                </p>
              </div>

              <div className={styles.guideCard}>
                <div className={styles.guideIconCircle}>
                  <TrendingUp size={20} aria-hidden="true" />
                </div>
                <h2 className={styles.guideTitle}>Live Citation Tracker</h2>
                <p className={styles.guideText}>
                  Saved papers automatically track live citation counts and velocity from Semantic Scholar.
                </p>
              </div>

              <div className={styles.guideCard}>
                <div className={styles.guideIconCircle}>
                  <Share2 size={20} aria-hidden="true" />
                </div>
                <h2 className={styles.guideTitle}>Export References</h2>
                <p className={styles.guideText}>
                  Copy formatted citations in 1-click for your research papers and literature reviews.
                </p>
              </div>
            </div>
          </div>
        )}

        {status === 'success' && articles.length > 0 && (
          <>
            <h2 className={styles.visuallyHidden}>Saved articles</h2>

            <div className={styles.dashboardBar}>
              <div className={styles.statsGroup}>
                <p className={styles.count}>
                  {articles.length} {articles.length === 1 ? 'saved article' : 'saved articles'}
                </p>
                {totalCitations > 0 && (
                  <span className={styles.citationBadge}>
                    {totalCitations.toLocaleString()} total citations
                  </span>
                )}
              </div>

              <div className={styles.actionsGroup}>
                {articles.length > 1 && (
                  <div className={styles.filterWrapper}>
                    <Search size={14} className={styles.filterIcon} aria-hidden="true" />
                    <input
                      type="text"
                      className={styles.filterInput}
                      placeholder="Filter saved articles..."
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      aria-label="Filter saved articles"
                    />
                  </div>
                )}

                <button
                  type="button"
                  className={styles.exportButton}
                  onClick={handleExportCitations}
                  title="Copy formatted references to clipboard"
                >
                  {copied ? (
                    <>
                      <Check size={14} aria-hidden="true" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} aria-hidden="true" />
                      Export References
                    </>
                  )}
                </button>
              </div>
            </div>


            {filteredResults.length === 0 ? (
              <p className={styles.noFilterResults}>
                No saved articles match "{filterQuery}".
              </p>
            ) : (
              <ArticleList articles={filteredResults} citationStats={citationStats} />
            )}
          </>
        )}

        {status === 'error' && <ErrorState onRetry={retry} />}
      </div>
    </section>
  )
}

