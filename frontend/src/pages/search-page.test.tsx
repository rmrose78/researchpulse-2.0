import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import SearchPage from './search-page'
import ReadingListProvider from '@/components/providers/reading-list-provider'
import { getSavedArticles, searchArticles } from '@/utils/api'
import type { ArticleSearchResult, SearchResponse } from '@/types'

jest.mock('@/utils/api', () => ({
  searchArticles: jest.fn(),
  getSavedArticles: jest.fn(),
  saveArticle: jest.fn(),
  removeSavedArticle: jest.fn(),
}))

const mockedSearchArticles = jest.mocked(searchArticles)
const mockedGetSavedArticles = jest.mocked(getSavedArticles)

async function renderPage() {
  const utils = render(
    <ReadingListProvider>
      <SearchPage />
    </ReadingListProvider>
  )
  await act(async () => {})
  return utils
}

function makeArticle(overrides: Partial<ArticleSearchResult> = {}): ArticleSearchResult {
  return {
    pmid: '123',
    title: 'A cardiac study',
    abstract: 'Abstract text',
    authors: ['Smith J'],
    journal: 'Journal of Cardiology',
    pub_date: '2026-01-01',
    doi: null,
    publication_types: [],
    ...overrides,
  }
}

function makeResponse(results: ArticleSearchResult[], query = 'cardiac'): SearchResponse {
  return { total: results.length, results, query }
}

beforeEach(() => {
  mockedSearchArticles.mockReset()
  mockedGetSavedArticles.mockReset()
  mockedGetSavedArticles.mockResolvedValue([])
  sessionStorage.clear()
})

describe('SearchPage', () => {
  it('shows the search form by default', async () => {
    // Arrange & Act
    await renderPage()

    // Assert
    expect(screen.getByRole('heading', { name: /^search pubmed$/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /search pubmed/i })).toBeInTheDocument()
  })

  it('blocks a short query without calling the API or leaving the search form', async () => {
    // Arrange
    await renderPage()

    // Act
    await userEvent.type(screen.getByRole('textbox', { name: /search pubmed/i }), 'a{Enter}')

    // Assert
    expect(mockedSearchArticles).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: /search pubmed/i })).toBeInTheDocument()
  })

  it('searches and shows results as cards, replacing the search form', async () => {
    // Arrange
    mockedSearchArticles.mockResolvedValue(makeResponse([makeArticle()]))
    await renderPage()

    // Act
    await userEvent.type(screen.getByRole('textbox', { name: /search pubmed/i }), 'cardiac{Enter}')

    // Assert
    expect(screen.queryByRole('textbox', { name: /search pubmed/i })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { name: /a cardiac study/i })).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: /results for 'cardiac'/i })).toBeInTheDocument()
  })

  it('going back to the form preserves the typed query without re-calling the API on an unchanged resubmit', async () => {
    // Arrange
    mockedSearchArticles.mockResolvedValue(makeResponse([makeArticle()]))
    await renderPage()
    await userEvent.type(screen.getByRole('textbox', { name: /search pubmed/i }), 'cardiac{Enter}')
    await waitFor(() => expect(screen.getByRole('heading', { name: /a cardiac study/i })).toBeInTheDocument())

    // Act
    await userEvent.click(screen.getByRole('button', { name: /new search/i }))

    // Assert — back on the form, not empty
    expect(screen.getByRole('heading', { name: /^search pubmed$/i })).toBeInTheDocument()
    const input = screen.getByRole('textbox', { name: /search pubmed/i })
    expect(input).toHaveValue('cardiac')

    // Act — resubmit unchanged
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }))

    // Assert — cached results reappear without a second network call
    await waitFor(() => expect(screen.getByRole('heading', { name: /a cardiac study/i })).toBeInTheDocument())
    expect(mockedSearchArticles).toHaveBeenCalledTimes(1)
  })

  it('shows an empty state for zero results, not an error', async () => {
    // Arrange
    mockedSearchArticles.mockResolvedValue(makeResponse([]))
    await renderPage()

    // Act
    await userEvent.type(screen.getByRole('textbox', { name: /search pubmed/i }), 'zzznotreal{Enter}')

    // Assert
    await waitFor(() => expect(screen.getByText(/no results found for 'zzznotreal'/i)).toBeInTheDocument())
  })

  it('passes filled-in filters through to the search request', async () => {
    // Arrange
    mockedSearchArticles.mockResolvedValue(makeResponse([makeArticle()]))
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: /show filters/i }))
    await userEvent.type(screen.getByLabelText(/journal/i), 'The Lancet')
    await userEvent.type(screen.getByRole('textbox', { name: /search pubmed/i }), 'cardiac')

    // Act
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }))

    // Assert
    await waitFor(() => expect(mockedSearchArticles).toHaveBeenCalledTimes(1))
    expect(mockedSearchArticles).toHaveBeenCalledWith('cardiac', {
      journal: 'The Lancet',
      date_from: '',
      date_to: '',
    })
  })

  it('shows an error state on API failure with a working retry', async () => {
    // Arrange
    mockedSearchArticles.mockRejectedValueOnce(new Error('API error: 502'))
    mockedSearchArticles.mockResolvedValueOnce(makeResponse([makeArticle()]))
    await renderPage()
    await userEvent.type(screen.getByRole('textbox', { name: /search pubmed/i }), 'cardiac{Enter}')
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

    // Act
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))

    // Assert
    await waitFor(() => expect(screen.getByRole('heading', { name: /a cardiac study/i })).toBeInTheDocument())
    expect(mockedSearchArticles).toHaveBeenCalledTimes(2)
  })

  it('triggers search API when clicking a suggested topic chip', async () => {
    // Arrange
    mockedSearchArticles.mockResolvedValue(makeResponse([makeArticle()]))
    await renderPage()

    // Act
    const chip = screen.getByRole('button', { name: /crispr-cas9/i })
    await userEvent.click(chip)

    // Assert
    await waitFor(() => expect(mockedSearchArticles).toHaveBeenCalledWith('CRISPR Cas9 gene editing', {
      journal: '',
      date_from: '',
      date_to: '',
    }))
    expect(screen.getByRole('heading', { name: /results for 'crispr cas9 gene editing'/i })).toBeInTheDocument()
  })

  it('has no automatically detectable accessibility violations on the search form', async () => {
    // Arrange
    const { container } = await renderPage()

    // Act
    const results = await axe(container)

    // Assert
    expect(results).toHaveNoViolations()
  })

  it('has no automatically detectable accessibility violations with results shown', async () => {
    // Arrange
    mockedSearchArticles.mockResolvedValue(makeResponse([makeArticle()]))
    const { container } = await renderPage()
    await userEvent.type(screen.getByRole('textbox', { name: /search pubmed/i }), 'cardiac{Enter}')
    await waitFor(() => expect(screen.getByRole('heading', { name: /a cardiac study/i })).toBeInTheDocument())

    // Act
    const results = await axe(container)

    // Assert
    expect(results).toHaveNoViolations()
  })
})

