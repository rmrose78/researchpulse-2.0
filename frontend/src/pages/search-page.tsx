import { useId } from 'react'
import { BookOpen, Filter, Search, Sparkles } from 'lucide-react'
import Hero from '@/components/sections/hero/hero'
import SearchBar from '@/components/sections/search-bar/search-bar'
import SearchResults from '@/components/sections/search-results/search-results'
import { useSearch } from '@/hooks/use-search'
import styles from './search-page.module.scss'

const SUGGESTED_TOPICS = [
  { label: 'CRISPR-Cas9', query: 'CRISPR Cas9 gene editing' },
  { label: 'CAR-T Therapy', query: 'CAR-T cell therapy oncology' },
  { label: 'GLP-1 Agonists', query: 'GLP-1 receptor agonist semaglutide' },
  { label: 'AI Diagnostics', query: 'artificial intelligence clinical diagnostics' },
  { label: 'mRNA Vaccines', query: 'mRNA vaccine technology lipid nanoparticles' },
  { label: 'Long COVID', query: 'Long COVID post-acute sequelae' },
]


export default function SearchPage() {
  const {
    query,
    setQuery,
    filters,
    setFilters,
    view,
    status,
    results,
    searchedQuery,
    search,
    goBack,
    retry,
    total,
    hasMore,
    isLoadingMore,
    loadMoreError,
    loadMore,
  } = useSearch()
  const searchPanelId = useId()

  function handleTopicClick(topicQuery: string) {
    setQuery(topicQuery)
    search(topicQuery)
  }

  if (view === 'results') {
    return (
      <SearchResults
        status={status}
        results={results}
        query={searchedQuery}
        onBack={goBack}
        onRetry={retry}
        total={total}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        loadMoreError={loadMoreError}
        onLoadMore={loadMore}
      />
    )
  }

  return (
    <Hero
      heading="Search PubMed"
      subtitle="Search any article on PubMed. 35+ million records, filtered by journal or date to find exactly what you need."
    >
      <div className={styles.container}>
        <div className={styles.formWrapper} id={searchPanelId}>
          <SearchBar
            value={query}
            onChange={setQuery}
            onSearch={search}
            filters={filters}
            onFiltersChange={setFilters}
            isLoading={status === 'loading'}
            autoFocus
          />
        </div>

        <div className={styles.topicsSection}>
          <div className={styles.topicsHeader}>
            <Sparkles size={16} aria-hidden="true" className={styles.sparkleIcon} />
            <span className={styles.topicsTitle}>Trending PubMed Queries</span>
          </div>
          <div className={styles.chipsGrid}>
            {SUGGESTED_TOPICS.map((topic) => (
              <button
                key={topic.label}
                type="button"
                className={styles.topicChip}
                onClick={() => handleTopicClick(topic.query)}
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.iconCircle}>
              <Search size={18} aria-hidden="true" />
            </div>
            <h2 className={styles.featureTitle}>35M+ Articles</h2>
            <p>Direct real-time API query across NLM NCBI PubMed biomedical literature database.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.iconCircle}>
              <Filter size={18} aria-hidden="true" />
            </div>
            <h2 className={styles.featureTitle}>Smart Filters</h2>
            <p>Filter by specific medical journal, custom publication date ranges, or publication types.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.iconCircle}>
              <BookOpen size={18} aria-hidden="true" />
            </div>
            <h2 className={styles.featureTitle}>Reading List &amp; DOI</h2>
            <p>Save any PubMed result directly to your personal reading list with 1-click citation lookup.</p>
          </div>
        </div>


        <details className={styles.searchTipsDetails}>
          <summary className={styles.searchTipsSummary}>
            <span>Advanced PubMed Search Syntax Tips</span>
          </summary>

          <div className={styles.tipsContent}>
            <p>
              <code>Doudna J[Author]</code> — Search articles written by a specific author.
            </p>
            <p>
              <code>"CAR-T"[Title]</code> — Target specific keywords in the title.
            </p>
            <p>
              <code>38123456</code> — Enter a numeric PMID directly for instant lookup.
            </p>
          </div>
        </details>
      </div>
    </Hero>
  )
}

