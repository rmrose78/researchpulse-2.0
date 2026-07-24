import { useMemo } from 'react'
import Hero from '@/components/sections/hero/hero'
import ArticleList from '@/components/sections/article-list/article-list'
import SearchSkeleton from '@/components/sections/search-skeleton/search-skeleton'
import EmptyState from '@/components/sections/empty-state/empty-state'
import ErrorState from '@/components/sections/error-state/error-state'
import TrendingFilters from '@/components/sections/trending-filters/trending-filters'
import VelocityExplainer from '@/components/sections/velocity-explainer/velocity-explainer'
import NotabilityExplainer from '@/components/sections/notability-explainer/notability-explainer'
import RankHistoryNotice from '@/components/sections/rank-history-notice/rank-history-notice'
import { useTrending } from '@/hooks/use-trending'
import { citationDetail, formatRelativeTime, whyTrendingSentence } from '@/utils/format'
import type { CitationStat, RankMovement } from '@/types'
import styles from './trending-page.module.scss'

export default function TrendingPage() {
  const {
    specialty,
    setSpecialty,
    mode,
    setMode,
    windowDays,
    setWindowDays,
    status: trendingStatus,
    articles: trendingArticles,
    computedAt,
    hasRankHistory,
    disabledSpecialties,
    retry: retryTrending,
  } = useTrending()

  const citationStats = useMemo(() => {
    const map: Record<string, CitationStat> = {}
    for (const article of trendingArticles) {
      // A 0-citation article is the expected, normal case in New & Notable
      // (recency is the point) — showing "0 citations" there reads as a
      // contradiction of "notable," so we omit the line entirely. A
      // nonzero count on a brand-new article is a genuine signal worth
      // keeping.
      if (mode === 'new_notable' && article.citation_count === 0) continue
      map[article.pmid] =
        mode === 'trending'
          ? { count: article.citation_count, velocity: article.velocity, detail: citationDetail(article, mode) }
          : { count: article.citation_count, detail: citationDetail(article, mode) }
    }
    return map
  }, [trendingArticles, mode])

  const notableTypes = useMemo(() => {
    const map: Record<string, string> = {}
    if (mode !== 'new_notable') return map
    for (const article of trendingArticles) {
      if (article.notable_type) map[article.pmid] = article.notable_type
    }
    return map
  }, [trendingArticles, mode])

  const rankMovements = useMemo(() => {
    const map: Record<string, RankMovement> = {}
    for (const article of trendingArticles) {
      if (article.is_new || (article.rank_delta !== null && article.rank_delta !== 0)) {
        map[article.pmid] = { delta: article.rank_delta, isNew: article.is_new }
      }
    }
    return map
  }, [trendingArticles])

  const whyTrending = useMemo(() => {
    const map: Record<string, string> = {}
    if (mode !== 'new_notable') return map
    for (const article of trendingArticles) {
      map[article.pmid] = whyTrendingSentence(article)
    }
    return map
  }, [trendingArticles, mode])

  return (
    <Hero>
      <section className={styles.trendingLayout} aria-label="Trending">
        <TrendingFilters
          mode={mode}
          onModeSelect={setMode}
          specialty={specialty}
          onSpecialtySelect={setSpecialty}
          disabledSpecialties={disabledSpecialties}
          windowDays={windowDays}
          onWindowDaysSelect={setWindowDays}
        />
        <div className={styles.trendingMain}>
          {computedAt && (
            <div className={styles.freshnessRow}>
              <p className={styles.freshness}>
                Updated {formatRelativeTime(computedAt)} · via Semantic Scholar
              </p>
              {mode === 'trending' && <VelocityExplainer />}
              {mode === 'new_notable' && <NotabilityExplainer />}
            </div>
          )}
          {trendingStatus === 'success' && trendingArticles.length > 0 && !hasRankHistory && (
            <RankHistoryNotice />
          )}
          <div aria-live="polite" className={styles.trendingResults}>
            {trendingStatus === 'loading' && <SearchSkeleton />}
            {trendingStatus === 'success' && trendingArticles.length === 0 && (
              <EmptyState message="No trending articles found for this specialty at this time range — try a wider range." />
            )}
            {trendingStatus === 'success' && trendingArticles.length > 0 && (
              <ArticleList
                articles={trendingArticles}
                citationStats={citationStats}
                notableTypes={notableTypes}
                rankMovements={rankMovements}
                whyTrending={whyTrending}
              />
            )}
            {trendingStatus === 'error' && <ErrorState onRetry={retryTrending} />}
          </div>
        </div>
      </section>
    </Hero>
  )
}
