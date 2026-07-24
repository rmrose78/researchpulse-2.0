import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { getSavedArticles, getTrending, getTrendingAvailability, searchArticles } from '@/utils/api'

jest.mock('@/utils/api', () => ({
  searchArticles: jest.fn(),
  getSavedArticles: jest.fn(),
  saveArticle: jest.fn(),
  removeSavedArticle: jest.fn(),
  getTrending: jest.fn(),
  getTrendingAvailability: jest.fn(),
  postPageView: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}))

function navigateTo(path: string) {
  window.history.pushState({}, '', path)
}

async function renderApp() {
  const utils = render(<App />)
  // Flush ReadingListProvider's initial getSavedArticles() fetch so its
  // resolution doesn't land after the test (and its act(...) wrapper) has finished.
  await act(async () => {})
  return utils
}

beforeEach(() => {
  jest.mocked(searchArticles).mockReset()
  jest.mocked(getSavedArticles).mockReset()
  jest.mocked(getSavedArticles).mockResolvedValue([])
  jest.mocked(getTrending).mockReset()
  jest.mocked(getTrending).mockResolvedValue({
    specialty: 'cardiology',
    mode: 'trending',
    window_days: 365,
    computed_at: '2026-01-01T00:00:00Z',
    has_rank_history: true,
    results: [],
  })
  jest.mocked(getTrendingAvailability).mockReset()
  jest.mocked(getTrendingAvailability).mockResolvedValue({
    window_days: 365,
    mode: 'trending',
    available: {},
  })
  sessionStorage.clear()
  navigateTo('/')
})

describe('App routing', () => {
  it('renders the Trending landing page at /', async () => {
    // Arrange & Act
    await renderApp()

    // Assert
    expect(screen.getByRole('heading', { name: /trending biomedical research/i })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: /specialty/i })).toBeInTheDocument()
  })

  it('renders the Search page at /search', async () => {
    // Arrange
    navigateTo('/search')

    // Act
    await renderApp()

    // Assert
    expect(screen.getByRole('heading', { name: /^search pubmed$/i })).toBeInTheDocument()
  })

  it('renders the reading list placeholder at /reading-list', async () => {
    // Arrange
    navigateTo('/reading-list')

    // Act
    await renderApp()

    // Assert
    expect(screen.getByRole('heading', { name: /^reading list$/i })).toBeInTheDocument()
  })

  it('renders the How It Works page at /how-it-works', async () => {
    // Arrange
    navigateTo('/how-it-works')

    // Act
    await renderApp()

    // Assert
    expect(screen.getByRole('heading', { name: /^how it works$/i })).toBeInTheDocument()
  })

  it('redirects an unknown route back to / (the Trending landing page)', async () => {
    // Arrange
    navigateTo('/this-route-does-not-exist')

    // Act
    await renderApp()

    // Assert
    expect(screen.getByRole('heading', { name: /trending biomedical research/i })).toBeInTheDocument()
  })

  it('has working nav links to trending, search, and reading list, and a home link to the landing page', async () => {
    // Arrange
    await renderApp()

    // Act & Assert
    expect(screen.getByRole('link', { name: /^trending$/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /^search pubmed$/i })).toHaveAttribute('href', '/search')
    expect(screen.getByRole('link', { name: /^reading list$/i })).toHaveAttribute(
      'href',
      '/reading-list'
    )
    expect(screen.getByRole('link', { name: /researchpulse home/i })).toHaveAttribute('href', '/')
  })

  it('the trending nav link is reachable from the reading list page', async () => {
    // Arrange
    navigateTo('/reading-list')

    // Act
    await renderApp()

    // Assert
    expect(screen.getByRole('link', { name: /^trending$/i })).toHaveAttribute('href', '/')
  })

  it('clicking Search PubMed in the nav navigates from Trending to the Search page', async () => {
    // Arrange
    await renderApp()

    // Act
    await userEvent.click(screen.getByRole('link', { name: /^search pubmed$/i }))

    // Assert
    expect(screen.getByRole('heading', { name: /^search pubmed$/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /search pubmed/i })).toBeInTheDocument()
  })
})
