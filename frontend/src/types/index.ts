export interface ArticleSearchResult {
  pmid: string
  title: string
  abstract: string | null
  authors: string[]
  journal: string | null
  pub_date: string | null
  doi: string | null
  publication_types: string[]
}

export interface SearchResponse {
  total: number
  results: ArticleSearchResult[]
  query: string
}

export interface SearchFilters {
  journal: string
  date_from: string
  date_to: string
}

export interface SavedArticle {
  id: number
  pmid: string
  title: string
  authors: string | null
  journal: string | null
  pub_date: string | null
  doi: string | null
  saved_at: string
}

export interface CitationStat {
  count: number
  velocity?: number
  detail?: string
}

export interface TrendingArticle extends ArticleSearchResult {
  citation_count: number
  velocity: number
  notable_type: string | null
  rank_delta: number | null
  is_new: boolean
  age_days: number
}

export interface RankMovement {
  delta: number | null
  isNew: boolean
}

export interface TrendingResponse {
  specialty: string
  mode: string
  window_days: number
  computed_at: string
  has_rank_history: boolean
  results: TrendingArticle[]
}

export interface TrendingAvailabilityResponse {
  window_days: number
  mode: string
  available: Record<string, boolean>
}

export interface PathCount {
  path: string
  count: number
}

export interface ReferrerCount {
  referrer: string
  count: number
}

export interface AnalyticsBucket {
  total_views: number
  top_paths: PathCount[]
  top_referrers: ReferrerCount[]
}

export interface AnalyticsSummary {
  today: AnalyticsBucket
  this_week: AnalyticsBucket
  this_month: AnalyticsBucket
  this_year: AnalyticsBucket
  all_time: AnalyticsBucket
}
