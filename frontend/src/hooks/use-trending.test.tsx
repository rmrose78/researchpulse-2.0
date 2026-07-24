import type { ReactNode } from 'react'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useTrending } from './use-trending'
import { getTrending, getTrendingAvailability } from '@/utils/api'
import { SPECIALTIES, DEFAULT_SPECIALTY } from '@/utils/specialties'
import { DEFAULT_WINDOW_DAYS, TIME_RANGES } from '@/utils/time-ranges'
import { TRENDING_MODES, DEFAULT_MODE } from '@/utils/trending-modes'
import type { TrendingArticle, TrendingAvailabilityResponse, TrendingResponse } from '@/types'

jest.mock('@/utils/api', () => ({
  getTrending: jest.fn(),
  getTrendingAvailability: jest.fn(),
}))

const mockedGetTrending = jest.mocked(getTrending)
const mockedGetTrendingAvailability = jest.mocked(getTrendingAvailability)

function makeArticle(overrides: Partial<TrendingArticle> = {}): TrendingArticle {
  return {
    pmid: '123',
    title: 'A cardiac study',
    abstract: 'Abstract text',
    authors: ['Smith J'],
    journal: 'Journal of Cardiology',
    pub_date: '2026-01-01',
    doi: null,
    publication_types: [],
    citation_count: 12,
    velocity: 0.6,
    notable_type: null,
    rank_delta: null,
    is_new: false,
    age_days: 30,
    ...overrides,
  }
}

function makeResponse(overrides: Partial<TrendingResponse> = {}): TrendingResponse {
  return {
    specialty: DEFAULT_SPECIALTY,
    mode: DEFAULT_MODE,
    window_days: DEFAULT_WINDOW_DAYS,
    computed_at: '2026-01-01T00:00:00Z',
    has_rank_history: true,
    results: [makeArticle()],
    ...overrides,
  }
}

function makeAvailability(
  overrides: Partial<TrendingAvailabilityResponse> = {}
): TrendingAvailabilityResponse {
  return { window_days: DEFAULT_WINDOW_DAYS, mode: DEFAULT_MODE, available: {}, ...overrides }
}

function renderUseTrending(initialEntry = '/') {
  function wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  }
  return renderHook(() => useTrending(), { wrapper })
}

beforeEach(() => {
  mockedGetTrending.mockReset()
  mockedGetTrending.mockResolvedValue(makeResponse())
  mockedGetTrendingAvailability.mockReset()
  mockedGetTrendingAvailability.mockResolvedValue(makeAvailability())
  window.localStorage.clear()
})

describe('useTrending', () => {
  it('starts on the default specialty/mode/window and loads both on mount', async () => {
    // Arrange & Act
    const { result } = renderUseTrending()

    // Assert
    expect(result.current.specialty).toBe(DEFAULT_SPECIALTY)
    expect(result.current.mode).toBe(DEFAULT_MODE)
    expect(result.current.windowDays).toBe(DEFAULT_WINDOW_DAYS)
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(mockedGetTrending).toHaveBeenCalledWith(DEFAULT_SPECIALTY, DEFAULT_MODE, DEFAULT_WINDOW_DAYS)
    expect(mockedGetTrendingAvailability).toHaveBeenCalledWith(DEFAULT_MODE, DEFAULT_WINDOW_DAYS)
  })

  it('exposes the fetched articles and freshness timestamp on success', async () => {
    // Arrange
    mockedGetTrending.mockResolvedValue(
      makeResponse({
        computed_at: '2026-01-01T06:00:00Z',
        has_rank_history: false,
        results: [makeArticle({ pmid: '999' })],
      })
    )

    // Act
    const { result } = renderUseTrending()
    await waitFor(() => expect(result.current.status).toBe('success'))

    // Assert
    expect(result.current.articles).toHaveLength(1)
    expect(result.current.articles[0].pmid).toBe('999')
    expect(result.current.computedAt).toBe('2026-01-01T06:00:00Z')
    expect(result.current.hasRankHistory).toBe(false)
  })

  it('sets error status when the fetch fails, and retry recovers', async () => {
    // Arrange
    mockedGetTrending.mockRejectedValueOnce(new Error('API error: 502'))
    mockedGetTrending.mockResolvedValueOnce(makeResponse())
    const { result } = renderUseTrending()
    await waitFor(() => expect(result.current.status).toBe('error'))

    // Act
    act(() => result.current.retry())

    // Assert
    await waitFor(() => expect(result.current.status).toBe('success'))
  })

  it('switching specialty flips back to loading and refetches for the new specialty at the current mode/window', async () => {
    // Arrange
    const secondSpecialty = SPECIALTIES[1].key
    const { result } = renderUseTrending()
    await waitFor(() => expect(result.current.status).toBe('success'))
    mockedGetTrending.mockResolvedValue(makeResponse({ specialty: secondSpecialty }))

    // Act
    act(() => result.current.setSpecialty(secondSpecialty))

    // Assert — flips to loading synchronously, before the new fetch resolves
    expect(result.current.status).toBe('loading')
    expect(result.current.specialty).toBe(secondSpecialty)
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(mockedGetTrending).toHaveBeenLastCalledWith(secondSpecialty, DEFAULT_MODE, DEFAULT_WINDOW_DAYS)
  })

  it('ignores a stale response from a superseded specialty switch', async () => {
    // Arrange — first request hangs, second resolves first
    let resolveFirst!: (value: TrendingResponse) => void
    mockedGetTrending.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve
      })
    )
    const { result } = renderUseTrending()
    const secondSpecialty = SPECIALTIES[1].key
    mockedGetTrending.mockResolvedValueOnce(makeResponse({ specialty: secondSpecialty }))

    // Act
    act(() => result.current.setSpecialty(secondSpecialty))
    await waitFor(() => expect(result.current.status).toBe('success'))
    act(() => resolveFirst(makeResponse({ specialty: DEFAULT_SPECIALTY })))

    // Assert — the late first-request response never overwrites the second's result
    expect(result.current.specialty).toBe(secondSpecialty)
    expect(result.current.status).toBe('success')
  })

  it('switching the time range never changes the currently selected specialty or mode', async () => {
    // Arrange
    const { result } = renderUseTrending()
    await waitFor(() => expect(result.current.status).toBe('success'))
    const newWindow = TIME_RANGES[0].days

    // Act
    act(() => result.current.setWindowDays(newWindow))
    await waitFor(() => expect(result.current.status).toBe('success'))

    // Assert — the range changed, specialty/mode stayed exactly as they were
    expect(result.current.windowDays).toBe(newWindow)
    expect(result.current.specialty).toBe(DEFAULT_SPECIALTY)
    expect(result.current.mode).toBe(DEFAULT_MODE)
    expect(mockedGetTrending).toHaveBeenLastCalledWith(DEFAULT_SPECIALTY, DEFAULT_MODE, newWindow)
  })

  it('switching the time range flips to loading and re-fetches availability for the new range', async () => {
    // Arrange
    const { result } = renderUseTrending()
    await waitFor(() => expect(result.current.status).toBe('success'))
    const newWindow = TIME_RANGES[3].days

    // Act
    act(() => result.current.setWindowDays(newWindow))

    // Assert
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(mockedGetTrendingAvailability).toHaveBeenLastCalledWith(DEFAULT_MODE, newWindow)
  })

  it('switching mode flips back to loading and refetches trending + availability for the new mode', async () => {
    // Arrange
    const newMode = TRENDING_MODES[1].key
    const { result } = renderUseTrending()
    await waitFor(() => expect(result.current.status).toBe('success'))
    mockedGetTrending.mockResolvedValue(makeResponse({ mode: newMode }))

    // Act
    act(() => result.current.setMode(newMode))

    // Assert
    expect(result.current.status).toBe('loading')
    expect(result.current.mode).toBe(newMode)
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(mockedGetTrending).toHaveBeenLastCalledWith(DEFAULT_SPECIALTY, newMode, DEFAULT_WINDOW_DAYS)
    expect(mockedGetTrendingAvailability).toHaveBeenLastCalledWith(newMode, DEFAULT_WINDOW_DAYS)
  })

  it('switching mode never changes the currently selected specialty or window', async () => {
    // Arrange
    const newMode = TRENDING_MODES[2].key
    const newWindow = TIME_RANGES[0].days
    const { result } = renderUseTrending()
    await waitFor(() => expect(result.current.status).toBe('success'))
    act(() => result.current.setWindowDays(newWindow))
    await waitFor(() => expect(result.current.status).toBe('success'))

    // Act
    act(() => result.current.setMode(newMode))
    await waitFor(() => expect(result.current.status).toBe('success'))

    // Assert
    expect(result.current.specialty).toBe(DEFAULT_SPECIALTY)
    expect(result.current.windowDays).toBe(newWindow)
  })

  it('reads specialty/mode/window from the URL on mount, for a bookmarked/shared link', async () => {
    // Arrange
    const specialty = SPECIALTIES[1].key
    const mode = TRENDING_MODES[1].key
    const windowDays = TIME_RANGES[0].days

    // Act
    const { result } = renderUseTrending(
      `/?specialty=${specialty}&mode=${mode}&window_days=${windowDays}`
    )
    await waitFor(() => expect(result.current.status).toBe('success'))

    // Assert
    expect(result.current.specialty).toBe(specialty)
    expect(result.current.mode).toBe(mode)
    expect(result.current.windowDays).toBe(windowDays)
    expect(mockedGetTrending).toHaveBeenCalledWith(specialty, mode, windowDays)
  })

  it('falls back to defaults for an invalid/stale value in the URL', async () => {
    // Arrange & Act
    const { result } = renderUseTrending('/?specialty=not_a_real_specialty&mode=bogus&window_days=999')
    await waitFor(() => expect(result.current.status).toBe('success'))

    // Assert
    expect(result.current.specialty).toBe(DEFAULT_SPECIALTY)
    expect(result.current.mode).toBe(DEFAULT_MODE)
    expect(result.current.windowDays).toBe(DEFAULT_WINDOW_DAYS)
  })

  it('exposes specialties known to be empty at the current window as disabled', async () => {
    // Arrange
    const emptySpecialty = SPECIALTIES[2].key
    mockedGetTrendingAvailability.mockResolvedValue(
      makeAvailability({ available: { [emptySpecialty]: false, [DEFAULT_SPECIALTY]: true } })
    )

    // Act
    const { result } = renderUseTrending()
    await waitFor(() => expect(result.current.status).toBe('success'))

    // Assert
    expect(result.current.disabledSpecialties.has(emptySpecialty)).toBe(true)
    expect(result.current.disabledSpecialties.has(DEFAULT_SPECIALTY)).toBe(false)
  })

  it('leaves specialties clickable (not disabled) when availability fails to load', async () => {
    // Arrange
    mockedGetTrendingAvailability.mockRejectedValue(new Error('API error: 500'))

    // Act
    const { result } = renderUseTrending()
    await waitFor(() => expect(result.current.status).toBe('success'))

    // Assert — best-effort only, never blocks or breaks the page
    expect(result.current.disabledSpecialties.size).toBe(0)
  })

  describe('localStorage persistence', () => {
    const SPECIALTY_KEY = 'researchpulse.trending.specialty'
    const MODE_KEY = 'researchpulse.trending.mode'

    it('restores specialty and mode from localStorage when no URL params are present', async () => {
      // Arrange
      const storedSpecialty = SPECIALTIES[1].key
      const storedMode = TRENDING_MODES[1].key
      window.localStorage.setItem(SPECIALTY_KEY, storedSpecialty)
      window.localStorage.setItem(MODE_KEY, storedMode)

      // Act
      const { result } = renderUseTrending()
      await waitFor(() => expect(result.current.status).toBe('success'))

      // Assert
      expect(result.current.specialty).toBe(storedSpecialty)
      expect(result.current.mode).toBe(storedMode)
      expect(mockedGetTrending).toHaveBeenCalledWith(storedSpecialty, storedMode, DEFAULT_WINDOW_DAYS)
    })

    it('falls back to defaults when the stored specialty/mode is invalid or stale', async () => {
      // Arrange
      window.localStorage.setItem(SPECIALTY_KEY, 'not_a_real_specialty')
      window.localStorage.setItem(MODE_KEY, 'bogus')

      // Act
      const { result } = renderUseTrending()
      await waitFor(() => expect(result.current.status).toBe('success'))

      // Assert
      expect(result.current.specialty).toBe(DEFAULT_SPECIALTY)
      expect(result.current.mode).toBe(DEFAULT_MODE)
    })

    it('prefers URL params over a stored localStorage value', async () => {
      // Arrange
      const storedSpecialty = SPECIALTIES[1].key
      const urlSpecialty = SPECIALTIES[2].key
      window.localStorage.setItem(SPECIALTY_KEY, storedSpecialty)

      // Act
      const { result } = renderUseTrending(`/?specialty=${urlSpecialty}`)
      await waitFor(() => expect(result.current.status).toBe('success'))

      // Assert
      expect(result.current.specialty).toBe(urlSpecialty)
    })

    it('persists the new specialty to localStorage when setSpecialty is called', async () => {
      // Arrange
      const nextSpecialty = SPECIALTIES[1].key
      const { result } = renderUseTrending()
      await waitFor(() => expect(result.current.status).toBe('success'))

      // Act
      act(() => result.current.setSpecialty(nextSpecialty))

      // Assert
      expect(window.localStorage.getItem(SPECIALTY_KEY)).toBe(nextSpecialty)
    })

    it('persists the new mode to localStorage when setMode is called', async () => {
      // Arrange
      const nextMode = TRENDING_MODES[1].key
      const { result } = renderUseTrending()
      await waitFor(() => expect(result.current.status).toBe('success'))

      // Act
      act(() => result.current.setMode(nextMode))

      // Assert
      expect(window.localStorage.getItem(MODE_KEY)).toBe(nextMode)
    })

    it('does not crash when localStorage throws (e.g. private browsing/quota exceeded)', async () => {
      // Arrange
      const getItemSpy = jest
        .spyOn(Storage.prototype, 'getItem')
        .mockImplementation(() => {
          throw new Error('SecurityError')
        })
      const setItemSpy = jest
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('SecurityError')
        })

      // Act & Assert — falls back to defaults, and setters don't throw
      const { result } = renderUseTrending()
      await waitFor(() => expect(result.current.status).toBe('success'))
      expect(result.current.specialty).toBe(DEFAULT_SPECIALTY)
      expect(result.current.mode).toBe(DEFAULT_MODE)
      expect(() => act(() => result.current.setSpecialty(SPECIALTIES[1].key))).not.toThrow()

      getItemSpy.mockRestore()
      setItemSpy.mockRestore()
    })
  })
})
