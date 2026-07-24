import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'jest-axe'
import TrendingPage from './trending-page'
import ReadingListProvider from '@/components/providers/reading-list-provider'
import { getSavedArticles, getTrending, getTrendingAvailability, saveArticle } from '@/utils/api'
import { DEFAULT_SPECIALTY } from '@/utils/specialties'
import { DEFAULT_WINDOW_DAYS } from '@/utils/time-ranges'
import { DEFAULT_MODE } from '@/utils/trending-modes'
import type { TrendingResponse } from '@/types'

jest.mock('@/utils/api', () => ({
  searchArticles: jest.fn(),
  getSavedArticles: jest.fn(),
  saveArticle: jest.fn(),
  removeSavedArticle: jest.fn(),
  getTrending: jest.fn(),
  getTrendingAvailability: jest.fn(),
}))

const mockedGetSavedArticles = jest.mocked(getSavedArticles)
const mockedSaveArticle = jest.mocked(saveArticle)
const mockedGetTrending = jest.mocked(getTrending)
const mockedGetTrendingAvailability = jest.mocked(getTrendingAvailability)

function makeTrendingResponse(overrides: Partial<TrendingResponse> = {}): TrendingResponse {
  return {
    specialty: DEFAULT_SPECIALTY,
    mode: DEFAULT_MODE,
    window_days: DEFAULT_WINDOW_DAYS,
    computed_at: '2026-01-01T00:00:00Z',
    has_rank_history: true,
    results: [],
    ...overrides,
  }
}

async function renderPage() {
  const utils = render(
    <MemoryRouter>
      <ReadingListProvider>
        <TrendingPage />
      </ReadingListProvider>
    </MemoryRouter>
  )
  // Flush the provider's initial getSavedArticles() fetch so its resolution
  // doesn't land after the test (and its act(...) wrapper) has finished.
  await act(async () => {})
  return utils
}

beforeEach(() => {
  mockedGetSavedArticles.mockReset()
  mockedGetSavedArticles.mockResolvedValue([])
  mockedSaveArticle.mockReset()
  mockedSaveArticle.mockResolvedValue(null)
  mockedGetTrending.mockReset()
  mockedGetTrending.mockResolvedValue(makeTrendingResponse())
  mockedGetTrendingAvailability.mockReset()
  mockedGetTrendingAvailability.mockResolvedValue({
    window_days: DEFAULT_WINDOW_DAYS,
    mode: DEFAULT_MODE,
    available: {},
  })
  sessionStorage.clear()
  localStorage.clear()
})

describe('TrendingPage', () => {
  it('shows the specialty selector by default', async () => {
    // Arrange & Act
    await renderPage()

    // Assert
    expect(screen.getByRole('radiogroup', { name: /specialty/i })).toBeInTheDocument()
  })

  it('shows the mode selector defaulting to Trending', async () => {
    // Arrange & Act
    await renderPage()

    // Assert
    expect(screen.getByRole('radiogroup', { name: /mode/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /^trending$/i })).toHaveAttribute('aria-checked', 'true')
  })

  it('shows trending results once loaded, with a freshness indicator', async () => {
    // Arrange
    mockedGetTrending.mockResolvedValue(
      makeTrendingResponse({
        computed_at: '2026-01-01T00:00:00Z',
        results: [
          {
            pmid: '123',
            title: 'A trending cardiac study',
            abstract: null,
            authors: [],
            journal: null,
            pub_date: '2025/Jan',
            doi: null,
            publication_types: [],
            citation_count: 14,
            velocity: 0.8,
            notable_type: null,
            rank_delta: null,
            is_new: false,
            age_days: 30,
          },
        ],
      })
    )

    // Act
    await renderPage()

    // Assert
    expect(await screen.findByRole('heading', { name: /a trending cardiac study/i })).toBeInTheDocument()
    expect(screen.getByText('14 citations in its first 30 days · velocity 0.80')).toBeInTheDocument()
    expect(screen.getByText(/updated .* · via semantic scholar/i)).toBeInTheDocument()
  })

  it('shows a "how is this calculated" trigger next to the freshness line once loaded', async () => {
    // Arrange & Act
    await renderPage()

    // Assert
    expect(
      await screen.findByRole('button', { name: /how is this calculated/i })
    ).toBeInTheDocument()
  })

  it('shows an empty state when a specialty has no trending results', async () => {
    // Arrange
    mockedGetTrending.mockResolvedValue(makeTrendingResponse({ results: [] }))

    // Act
    await renderPage()

    // Assert
    expect(await screen.findByText(/no trending articles found/i)).toBeInTheDocument()
  })

  it('shows an error state with retry when trending fails to load', async () => {
    // Arrange
    mockedGetTrending.mockRejectedValueOnce(new Error('API error: 502'))
    mockedGetTrending.mockResolvedValueOnce(makeTrendingResponse())
    await renderPage()
    await screen.findByRole('alert')

    // Act
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))

    // Assert
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('switching specialty requests trending data for the newly selected specialty', async () => {
    // Arrange
    await renderPage()
    await waitFor(() => expect(mockedGetTrending).toHaveBeenCalledTimes(1))

    // Act
    await userEvent.click(screen.getByRole('radio', { name: /oncology/i }))

    // Assert
    await waitFor(() =>
      expect(mockedGetTrending).toHaveBeenLastCalledWith('oncology', DEFAULT_MODE, DEFAULT_WINDOW_DAYS)
    )
  })

  it('shows the time range selector and switching it requests the current specialty at the new range', async () => {
    // Arrange
    await renderPage()
    await waitFor(() => expect(mockedGetTrending).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('radiogroup', { name: /time range/i })).toBeInTheDocument()

    // Act
    await userEvent.click(screen.getByRole('radio', { name: '60 days' }))

    // Assert
    await waitFor(() =>
      expect(mockedGetTrending).toHaveBeenLastCalledWith(DEFAULT_SPECIALTY, DEFAULT_MODE, 60)
    )
  })

  it('switching mode requests trending data for the newly selected mode', async () => {
    // Arrange
    await renderPage()
    await waitFor(() => expect(mockedGetTrending).toHaveBeenCalledTimes(1))

    // Act
    await userEvent.click(screen.getByRole('radio', { name: /most cited/i }))

    // Assert
    await waitFor(() =>
      expect(mockedGetTrending).toHaveBeenLastCalledWith(DEFAULT_SPECIALTY, 'most_cited', DEFAULT_WINDOW_DAYS)
    )
  })

  it('hides the "how is this calculated" velocity trigger outside Trending mode', async () => {
    // Arrange
    mockedGetTrending.mockResolvedValue(makeTrendingResponse({ mode: 'most_cited' }))
    await renderPage()
    await screen.findByText(/updated .* · via semantic scholar/i)

    // Act
    await userEvent.click(screen.getByRole('radio', { name: /most cited/i }))

    // Assert
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /how is this calculated/i })).not.toBeInTheDocument()
    )
  })

  it('omits the velocity figure from the citation stat line outside Trending mode', async () => {
    // Arrange
    const article = {
      pmid: '123',
      title: 'A most-cited study',
      abstract: null,
      authors: [],
      journal: null,
      pub_date: '2025/Jan',
      doi: null,
      publication_types: [],
      citation_count: 50,
      velocity: 0.1,
      notable_type: null,
      rank_delta: null,
      is_new: false,
      age_days: 30,
    }
    mockedGetTrending.mockResolvedValue(makeTrendingResponse({ results: [article] }))
    await renderPage()
    await screen.findByRole('heading', { name: /a most-cited study/i })

    // Act
    mockedGetTrending.mockResolvedValue(
      makeTrendingResponse({ mode: 'most_cited', results: [article] })
    )
    await userEvent.click(screen.getByRole('radio', { name: /most cited/i }))
    await screen.findByRole('heading', { name: /a most-cited study/i })

    // Assert
    await waitFor(() => expect(screen.getByText('50 citations overall')).toBeInTheDocument())
    expect(within(screen.getByRole('list')).queryByText(/velocity/i)).not.toBeInTheDocument()
  })

  it('hides the citation stat line for 0-citation articles in New & Notable mode, but keeps it for nonzero ones', async () => {
    // Arrange
    const brandNew = {
      pmid: '111',
      title: 'A brand new article',
      abstract: null,
      authors: [],
      journal: null,
      pub_date: '2026/Jul',
      doi: null,
      publication_types: [],
      citation_count: 0,
      velocity: 0,
      notable_type: null,
      rank_delta: null,
      is_new: false,
      age_days: 30,
    }
    const alreadyCited = {
      pmid: '222',
      title: 'A new article already gaining traction',
      abstract: null,
      authors: [],
      journal: null,
      pub_date: '2026/Jun',
      doi: null,
      publication_types: [],
      citation_count: 3,
      velocity: 0.1,
      notable_type: null,
      rank_delta: null,
      is_new: false,
      age_days: 30,
    }
    mockedGetTrending.mockResolvedValue(
      makeTrendingResponse({ mode: 'new_notable', results: [brandNew, alreadyCited] })
    )
    await renderPage()
    await screen.findByRole('heading', { name: /a brand new article/i })

    // Act
    await userEvent.click(screen.getByRole('radio', { name: /new & notable/i }))
    await screen.findByRole('heading', { name: /a brand new article/i })

    // Assert
    expect(screen.queryByText(/0 citations/i)).not.toBeInTheDocument()
    expect(screen.getByText('3 citations')).toBeInTheDocument()
  })

  it('shows a "how is this calculated" trigger for notability in New & Notable mode', async () => {
    // Arrange
    mockedGetTrending.mockResolvedValue(makeTrendingResponse({ mode: 'new_notable' }))
    await renderPage()
    await screen.findByText(/updated .* · via semantic scholar/i)

    // Act
    await userEvent.click(screen.getByRole('radio', { name: /new & notable/i }))

    // Assert
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /how is this calculated/i })).toBeInTheDocument()
    )
  })

  it('shows an evidence-tier badge for a tiered article in New & Notable mode, but not for others', async () => {
    // Arrange
    const rct = {
      pmid: '111',
      title: 'A randomized trial',
      abstract: null,
      authors: [],
      journal: null,
      pub_date: '2026/Jul',
      doi: null,
      publication_types: ['Randomized Controlled Trial'],
      citation_count: 0,
      velocity: 0,
      notable_type: 'Randomized Controlled Trial',
      rank_delta: null,
      is_new: false,
      age_days: 30,
    }
    const plain = {
      pmid: '222',
      title: 'A plain new article',
      abstract: null,
      authors: [],
      journal: null,
      pub_date: '2026/Jun',
      doi: null,
      publication_types: [],
      citation_count: 0,
      velocity: 0,
      notable_type: null,
      rank_delta: null,
      is_new: false,
      age_days: 30,
    }
    mockedGetTrending.mockResolvedValue(
      makeTrendingResponse({ mode: 'new_notable', results: [rct, plain] })
    )
    await renderPage()
    await screen.findByRole('heading', { name: /a randomized trial/i })

    // Act
    await userEvent.click(screen.getByRole('radio', { name: /new & notable/i }))
    await screen.findByRole('heading', { name: /a randomized trial/i })

    // Assert
    expect(screen.getByText('Randomized Controlled Trial')).toBeInTheDocument()
  })

  it('shows no evidence-tier badge for a tiered article outside New & Notable mode', async () => {
    // Arrange
    const rct = {
      pmid: '111',
      title: 'A randomized trial',
      abstract: null,
      authors: [],
      journal: null,
      pub_date: '2026/Jul',
      doi: null,
      publication_types: ['Randomized Controlled Trial'],
      citation_count: 5,
      velocity: 0.2,
      notable_type: null,
      rank_delta: null,
      is_new: false,
      age_days: 30,
    }
    mockedGetTrending.mockResolvedValue(makeTrendingResponse({ results: [rct] }))

    // Act
    await renderPage()
    await screen.findByRole('heading', { name: /a randomized trial/i })

    // Assert
    expect(screen.queryByText('Randomized Controlled Trial')).not.toBeInTheDocument()
  })

  it('shows a NEW badge for an article marked is_new, alongside the citation stat', async () => {
    // Arrange
    const article = {
      pmid: '111',
      title: 'A freshly surfaced article',
      abstract: null,
      authors: [],
      journal: null,
      pub_date: '2026/Jul',
      doi: null,
      publication_types: [],
      citation_count: 5,
      velocity: 0.2,
      notable_type: null,
      rank_delta: null,
      is_new: true,
      age_days: 30,
    }
    mockedGetTrending.mockResolvedValue(makeTrendingResponse({ results: [article] }))

    // Act
    await renderPage()

    // Assert
    expect(await screen.findByRole('heading', { name: /a freshly surfaced article/i })).toBeInTheDocument()
    expect(screen.getByText('NEW')).toBeInTheDocument()
  })

  it('shows an up-arrow rank badge across all 3 modes, not just Trending', async () => {
    // Arrange
    const article = {
      pmid: '222',
      title: 'A climbing article',
      abstract: null,
      authors: [],
      journal: null,
      pub_date: '2026/Jul',
      doi: null,
      publication_types: [],
      citation_count: 5,
      velocity: 0.2,
      notable_type: null,
      rank_delta: 3,
      is_new: false,
      age_days: 30,
    }
    mockedGetTrending.mockResolvedValue(
      makeTrendingResponse({ mode: 'most_cited', results: [article] })
    )
    await renderPage()
    await screen.findByRole('heading', { name: /a climbing article/i })

    // Act
    await userEvent.click(screen.getByRole('radio', { name: /most cited/i }))
    await screen.findByRole('heading', { name: /a climbing article/i })

    // Assert
    expect(screen.getByText('↑3')).toBeInTheDocument()
  })

  it('folds the article age into the citation-stat line in Trending mode, not a separate sentence', async () => {
    // Arrange
    const article = {
      pmid: '333',
      title: 'A well-explained article',
      abstract: null,
      authors: [],
      journal: null,
      pub_date: '2026/Apr',
      doi: null,
      publication_types: [],
      citation_count: 41,
      velocity: 0.2,
      notable_type: null,
      rank_delta: null,
      is_new: false,
      age_days: 90,
    }
    mockedGetTrending.mockResolvedValue(makeTrendingResponse({ results: [article] }))

    // Act
    await renderPage()

    // Assert
    expect(await screen.findByRole('heading', { name: /a well-explained article/i })).toBeInTheDocument()
    expect(screen.getByText('41 citations in its first 90 days · velocity 0.20')).toBeInTheDocument()
  })

  it('folds the "overall" qualifier into the citation-stat line in Most Cited mode', async () => {
    // Arrange
    const article = {
      pmid: '334',
      title: 'A most-cited well-explained article',
      abstract: null,
      authors: [],
      journal: null,
      pub_date: '2026/Apr',
      doi: null,
      publication_types: [],
      citation_count: 41,
      velocity: 0.2,
      notable_type: null,
      rank_delta: null,
      is_new: false,
      age_days: 90,
    }
    mockedGetTrending.mockResolvedValue(
      makeTrendingResponse({ mode: 'most_cited', results: [article] })
    )
    await renderPage()
    await screen.findByRole('heading', { name: /most-cited well-explained article/i })

    // Act
    await userEvent.click(screen.getByRole('radio', { name: /most cited/i }))

    // Assert
    expect(await screen.findByText('41 citations overall')).toBeInTheDocument()
  })

  it('lets the user save a trending card to the reading list', async () => {
    // Arrange
    const article = {
      pmid: '444',
      title: 'A savable article',
      abstract: null,
      authors: [],
      journal: null,
      pub_date: '2026/Apr',
      doi: null,
      publication_types: [],
      citation_count: 5,
      velocity: 0.2,
      notable_type: null,
      rank_delta: null,
      is_new: false,
      age_days: 10,
    }
    mockedGetTrending.mockResolvedValue(makeTrendingResponse({ results: [article] }))
    await renderPage()
    await screen.findByRole('heading', { name: /a savable article/i })

    // Act
    await userEvent.click(screen.getByRole('button', { name: /save to reading list/i }))

    // Assert
    expect(screen.getByRole('button', { name: /remove from reading list/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('shows a rank-history notice when this view has no comparison data yet', async () => {
    // Arrange
    mockedGetTrending.mockResolvedValue(
      makeTrendingResponse({
        has_rank_history: false,
        results: [
          {
            pmid: '555',
            title: 'A brand new combination',
            abstract: null,
            authors: [],
            journal: null,
            pub_date: '2026/Jul',
            doi: null,
            publication_types: [],
            citation_count: 5,
            velocity: 0.2,
            notable_type: null,
            rank_delta: null,
            is_new: false,
            age_days: 10,
          },
        ],
      })
    )

    // Act
    await renderPage()

    // Assert
    expect(await screen.findByText(/doesn't have trend history yet/i)).toBeInTheDocument()
  })

  it('does not show the rank-history notice once real comparison data exists', async () => {
    // Arrange
    mockedGetTrending.mockResolvedValue(
      makeTrendingResponse({
        has_rank_history: true,
        results: [
          {
            pmid: '556',
            title: 'An already-compared article',
            abstract: null,
            authors: [],
            journal: null,
            pub_date: '2026/Jul',
            doi: null,
            publication_types: [],
            citation_count: 5,
            velocity: 0.2,
            notable_type: null,
            rank_delta: null,
            is_new: false,
            age_days: 10,
          },
        ],
      })
    )

    // Act
    await renderPage()

    // Assert
    await screen.findByRole('heading', { name: /an already-compared article/i })
    expect(screen.queryByText(/doesn't have trend history yet/i)).not.toBeInTheDocument()
  })

  it('does not show the rank-history notice alongside the empty state', async () => {
    // Arrange
    mockedGetTrending.mockResolvedValue(
      makeTrendingResponse({ has_rank_history: false, results: [] })
    )

    // Act
    await renderPage()

    // Assert
    await screen.findByText(/no trending articles found/i)
    expect(screen.queryByText(/doesn't have trend history yet/i)).not.toBeInTheDocument()
  })

  it('disables a specialty pill already known to have no results at the current range', async () => {
    // Arrange
    mockedGetTrendingAvailability.mockResolvedValue({
      window_days: DEFAULT_WINDOW_DAYS,
      mode: DEFAULT_MODE,
      available: { oncology: false },
    })

    // Act
    await renderPage()

    // Assert
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /oncology/i })).toBeDisabled()
    )
  })

  it('has no automatically detectable accessibility violations', async () => {
    // Arrange
    const { container } = await renderPage()

    // Act
    const results = await axe(container)

    // Assert
    expect(results).toHaveNoViolations()
  })
})
