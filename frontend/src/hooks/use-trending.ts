import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getTrending, getTrendingAvailability } from '@/utils/api'
import { SPECIALTIES, DEFAULT_SPECIALTY } from '@/utils/specialties'
import { TIME_RANGES, DEFAULT_WINDOW_DAYS } from '@/utils/time-ranges'
import { TRENDING_MODES, DEFAULT_MODE } from '@/utils/trending-modes'
import type { TrendingArticle } from '@/types'

export type TrendingStatus = 'loading' | 'success' | 'error'

interface UseTrendingResult {
  specialty: string
  setSpecialty: (specialty: string) => void
  mode: string
  setMode: (mode: string) => void
  windowDays: number
  setWindowDays: (days: number) => void
  status: TrendingStatus
  articles: TrendingArticle[]
  computedAt: string | null
  hasRankHistory: boolean
  disabledSpecialties: Set<string>
  retry: () => void
}

const VALID_SPECIALTIES = new Set(SPECIALTIES.map((s) => s.key))
const VALID_MODES = new Set(TRENDING_MODES.map((m) => m.key))
const VALID_WINDOW_DAYS = new Set(TIME_RANGES.map((r) => r.days))

const STORAGE_KEY_SPECIALTY = 'researchpulse.trending.specialty'
const STORAGE_KEY_MODE = 'researchpulse.trending.mode'

function readStoredValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStoredValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // best-effort — private browsing / quota exceeded, no crash
  }
}

export function useTrending(): UseTrendingResult {
  // URL is the source of truth for specialty/mode/window — makes the current
  // combination bookmarkable/shareable, and survives a page reload. Each
  // value is validated against its known list on every read, falling back to
  // its default for a missing or stale/invalid stored value (e.g. from a
  // hand-edited URL or an older app version). When the URL has no explicit
  // value, fall back to the last value the user picked (persisted in
  // localStorage) before falling back to the hardcoded default.
  const [searchParams, setSearchParams] = useSearchParams()

  const specialtyParam = searchParams.get('specialty')
  const storedSpecialty = readStoredValue(STORAGE_KEY_SPECIALTY)
  const specialty =
    specialtyParam && VALID_SPECIALTIES.has(specialtyParam)
      ? specialtyParam
      : storedSpecialty && VALID_SPECIALTIES.has(storedSpecialty)
        ? storedSpecialty
        : DEFAULT_SPECIALTY

  const modeParam = searchParams.get('mode')
  const storedMode = readStoredValue(STORAGE_KEY_MODE)
  const mode =
    modeParam && VALID_MODES.has(modeParam)
      ? modeParam
      : storedMode && VALID_MODES.has(storedMode)
        ? storedMode
        : DEFAULT_MODE

  const windowDaysParam = Number(searchParams.get('window_days'))
  const windowDays = VALID_WINDOW_DAYS.has(windowDaysParam) ? windowDaysParam : DEFAULT_WINDOW_DAYS

  const [status, setStatus] = useState<TrendingStatus>('loading')
  const [articles, setArticles] = useState<TrendingArticle[]>([])
  const [computedAt, setComputedAt] = useState<string | null>(null)
  const [hasRankHistory, setHasRankHistory] = useState(false)
  const [disabledSpecialties, setDisabledSpecialties] = useState<Set<string>>(new Set())

  // Bumped on every fetch; a resolving/rejecting request only applies its
  // outcome if it's still the latest one, so switching specialty/mode/time
  // range quickly can't have an earlier response clobber a newer one.
  const requestIdRef = useRef(0)

  const fetchTrending = useCallback(
    (activeSpecialty: string, activeMode: string, activeWindowDays: number) => {
      const requestId = ++requestIdRef.current

      getTrending(activeSpecialty, activeMode, activeWindowDays)
        .then((response) => {
          if (requestIdRef.current !== requestId) return
          setArticles(response.results)
          setComputedAt(response.computed_at)
          setHasRankHistory(response.has_rank_history)
          setStatus('success')
        })
        .catch((error) => {
          if (requestIdRef.current !== requestId) return
          console.error('Failed to load trending articles:', error)
          setStatus('error')
        })
    },
    []
  )

  // Cache-only on the backend (never triggers a PubMed/Semantic Scholar
  // call), so this is safe to call on every mode/time-range change. Best-effort:
  // a failure here just means pills stay clickable as normal, never blocks
  // or errors the page.
  const fetchAvailability = useCallback((activeMode: string, activeWindowDays: number) => {
    getTrendingAvailability(activeMode, activeWindowDays)
      .then((response) => {
        const disabled = new Set(
          Object.entries(response.available)
            .filter(([, available]) => !available)
            .map(([key]) => key)
        )
        setDisabledSpecialties(disabled)
      })
      .catch(() => {})
  }, [])

  // Mount-only fetch for the default/URL-derived specialty/mode/window —
  // `status` already defaults to 'loading', so nothing needs to be set
  // synchronously here.
  useEffect(() => {
    fetchTrending(specialty, mode, windowDays)
    fetchAvailability(mode, windowDays)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setSpecialty = useCallback(
    (next: string) => {
      writeStoredValue(STORAGE_KEY_SPECIALTY, next)
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        params.set('specialty', next)
        return params
      })
      setStatus('loading')
      fetchTrending(next, mode, windowDays)
    },
    [fetchTrending, mode, windowDays, setSearchParams]
  )

  const setMode = useCallback(
    (next: string) => {
      writeStoredValue(STORAGE_KEY_MODE, next)
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        params.set('mode', next)
        return params
      })
      setStatus('loading')
      fetchTrending(specialty, next, windowDays)
      fetchAvailability(next, windowDays)
    },
    [fetchTrending, fetchAvailability, specialty, windowDays, setSearchParams]
  )

  const setWindowDays = useCallback(
    (next: number) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        params.set('window_days', String(next))
        return params
      })
      setStatus('loading')
      fetchTrending(specialty, mode, next)
      fetchAvailability(mode, next)
    },
    [fetchTrending, fetchAvailability, specialty, mode, setSearchParams]
  )

  const retry = useCallback(() => {
    setStatus('loading')
    fetchTrending(specialty, mode, windowDays)
  }, [fetchTrending, specialty, mode, windowDays])

  return {
    specialty,
    setSpecialty,
    mode,
    setMode,
    windowDays,
    setWindowDays,
    status,
    articles,
    computedAt,
    hasRankHistory,
    disabledSpecialties,
    retry,
  }
}
