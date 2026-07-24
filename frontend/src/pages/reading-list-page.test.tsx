import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'jest-axe'
import ReadingListPage from './reading-list-page'
import ReadingListProvider from '@/components/providers/reading-list-provider'
import { getReadingListCitations, getSavedArticles } from '@/utils/api'
import type { SavedArticle } from '@/types'

jest.mock('@/utils/api', () => ({
  getSavedArticles: jest.fn(),
  saveArticle: jest.fn(),
  removeSavedArticle: jest.fn(),
  getReadingListCitations: jest.fn(),
}))

const mockedGetSavedArticles = jest.mocked(getSavedArticles)
const mockedGetReadingListCitations = jest.mocked(getReadingListCitations)

function makeSaved(overrides: Partial<SavedArticle> = {}): SavedArticle {
  return {
    id: 1,
    pmid: '123',
    title: 'A cardiac study',
    authors: 'Smith J, Lee K',
    journal: 'Journal of Cardiology',
    pub_date: '2026-01-01',
    doi: null,
    saved_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

async function renderPage() {
  const utils = render(
    <MemoryRouter>
      <ReadingListProvider>
        <ReadingListPage />
      </ReadingListProvider>
    </MemoryRouter>
  )
  await act(async () => {})
  return utils
}

beforeEach(() => {
  mockedGetSavedArticles.mockReset()
  mockedGetReadingListCitations.mockReset()
  mockedGetReadingListCitations.mockResolvedValue({})
})

describe('ReadingListPage', () => {
  it('shows a skeleton while the initial fetch is in flight', () => {
    // Arrange
    mockedGetSavedArticles.mockReturnValue(new Promise(() => {}))

    // Act
    render(
      <ReadingListProvider>
        <ReadingListPage />
      </ReadingListProvider>
    )

    // Assert
    expect(screen.getByRole('status')).toHaveTextContent(/loading results/i)
  })

  it('shows saved articles newest first once loaded', async () => {
    // Arrange
    mockedGetSavedArticles.mockResolvedValue([
      makeSaved({ pmid: '1', title: 'Newest saved article' }),
      makeSaved({ pmid: '2', title: 'Oldest saved article' }),
    ])

    // Act
    await renderPage()

    // Assert
    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings[0]).toHaveTextContent(/newest saved article/i)
    expect(headings[1]).toHaveTextContent(/oldest saved article/i)
  })

  it('shows an inviting empty state when nothing is saved', async () => {
    // Arrange
    mockedGetSavedArticles.mockResolvedValue([])

    // Act
    await renderPage()

    // Assert
    expect(screen.getByText(/your reading list is empty/i)).toBeInTheDocument()
  })

  it('links back to Search from the empty state', async () => {
    // Arrange
    mockedGetSavedArticles.mockResolvedValue([])

    // Act
    await renderPage()

    // Assert
    expect(screen.getByRole('link', { name: /search pubmed/i })).toHaveAttribute('href', '/search')
  })

  it('shows a subtitle describing the page', async () => {
    // Arrange
    mockedGetSavedArticles.mockResolvedValue([])

    // Act
    await renderPage()

    // Assert
    expect(screen.getByText(/articles you've saved for later/i)).toBeInTheDocument()
  })

  it('shows a saved-article count when populated', async () => {
    // Arrange
    mockedGetSavedArticles.mockResolvedValue([
      makeSaved({ pmid: '1' }),
      makeSaved({ pmid: '2' }),
    ])

    // Act
    await renderPage()

    // Assert
    expect(await screen.findByText('2 saved articles')).toBeInTheDocument()
  })

  it('uses singular wording for exactly one saved article', async () => {
    // Arrange
    mockedGetSavedArticles.mockResolvedValue([makeSaved({ pmid: '1' })])

    // Act
    await renderPage()

    // Assert
    expect(await screen.findByText('1 saved article')).toBeInTheDocument()
  })

  it('shows an error state with a working retry on load failure', async () => {
    // Arrange
    mockedGetSavedArticles.mockRejectedValueOnce(new Error('API error: 500'))
    mockedGetSavedArticles.mockResolvedValueOnce([makeSaved()])
    await renderPage()
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

    // Act
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))

    // Assert
    await waitFor(() => expect(screen.getByRole('heading', { name: /a cardiac study/i })).toBeInTheDocument())
  })

  it('shows live citation counts fetched via one batch call', async () => {
    // Arrange
    mockedGetSavedArticles.mockResolvedValue([makeSaved({ pmid: '1' })])
    mockedGetReadingListCitations.mockResolvedValue({ '1': 14 })

    // Act
    await renderPage()

    // Assert
    expect(await screen.findByText('14 citations')).toBeInTheDocument()
    expect(mockedGetReadingListCitations).toHaveBeenCalledTimes(1)
  })

  it('omits the citation count for an article Semantic Scholar has no data for', async () => {
    // Arrange
    mockedGetSavedArticles.mockResolvedValue([makeSaved({ pmid: '1' })])
    mockedGetReadingListCitations.mockResolvedValue({})

    // Act
    await renderPage()

    // Assert
    await screen.findByRole('heading', { name: /a cardiac study/i })
    expect(screen.queryByText(/citation/i)).not.toBeInTheDocument()
  })

  it('never shows velocity on the reading list page', async () => {
    // Arrange
    mockedGetSavedArticles.mockResolvedValue([makeSaved({ pmid: '1' })])
    mockedGetReadingListCitations.mockResolvedValue({ '1': 14 })

    // Act
    await renderPage()

    // Assert
    expect(await screen.findByText('14 citations')).toBeInTheDocument()
    expect(screen.queryByText(/velocity/i)).not.toBeInTheDocument()
  })

  it('does not let a failed citations fetch block the reading list from rendering', async () => {
    // Arrange
    mockedGetSavedArticles.mockResolvedValue([makeSaved({ pmid: '1' })])
    mockedGetReadingListCitations.mockRejectedValue(new Error('API error: 502'))

    // Act
    await renderPage()

    // Assert
    expect(await screen.findByRole('heading', { name: /a cardiac study/i })).toBeInTheDocument()
  })

  it('has no automatically detectable accessibility violations when populated', async () => {
    // Arrange
    mockedGetSavedArticles.mockResolvedValue([makeSaved()])
    const { container } = await renderPage()

    // Act
    const results = await axe(container)

    // Assert
    expect(results).toHaveNoViolations()
  })

  it('has no automatically detectable accessibility violations when empty', async () => {
    // Arrange
    mockedGetSavedArticles.mockResolvedValue([])
    const { container } = await renderPage()

    // Act
    const results = await axe(container)

    // Assert
    expect(results).toHaveNoViolations()
  })
})
