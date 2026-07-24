import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import SearchResults from './search-results'
import ReadingListProvider from '@/components/providers/reading-list-provider'
import { getSavedArticles } from '@/utils/api'
import type { ArticleSearchResult } from '@/types'
import type { SearchStatus } from '@/hooks/use-search'
import type { ComponentProps } from 'react'

jest.mock('@/utils/api', () => ({
  getSavedArticles: jest.fn(),
  saveArticle: jest.fn(),
  removeSavedArticle: jest.fn(),
}))

const mockedGetSavedArticles = jest.mocked(getSavedArticles)

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

const loadMoreDefaults = {
  total: 1,
  hasMore: false,
  isLoadingMore: false,
  loadMoreError: null,
  onLoadMore: jest.fn(),
}

async function renderResults(props: ComponentProps<typeof SearchResults>) {
  const utils = render(
    <ReadingListProvider>
      <SearchResults {...props} />
    </ReadingListProvider>
  )
  // Flush the provider's initial getSavedArticles() fetch so its resolution
  // doesn't land after the test (and its act(...) wrapper) has finished.
  await act(async () => {})
  return utils
}

beforeEach(() => {
  mockedGetSavedArticles.mockReset()
  mockedGetSavedArticles.mockResolvedValue([])
})

describe('SearchResults', () => {
  it('shows a heading with the searched query', async () => {
    // Arrange & Act
    await renderResults({
      status: 'success',
      results: [makeArticle()],
      query: 'cardiac',
      onBack: jest.fn(),
      onRetry: jest.fn(),
      ...loadMoreDefaults,
    })

    // Assert
    expect(screen.getByRole('heading', { name: /results for 'cardiac'/i })).toBeInTheDocument()
  })

  it('moves focus to the heading on mount', async () => {
    // Arrange & Act
    await renderResults({
      status: 'success',
      results: [makeArticle()],
      query: 'cardiac',
      onBack: jest.fn(),
      onRetry: jest.fn(),
      ...loadMoreDefaults,
    })

    // Assert
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /results for 'cardiac'/i })).toHaveFocus()
    )
  })

  it('calls onBack when the back button is clicked', async () => {
    // Arrange
    const onBack = jest.fn()
    await renderResults({
      status: 'success',
      results: [],
      query: 'cardiac',
      onBack,
      onRetry: jest.fn(),
      ...loadMoreDefaults,
    })

    // Act
    await userEvent.click(screen.getByRole('button', { name: /new search/i }))

    // Assert
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders a skeleton while loading', async () => {
    // Arrange & Act
    await renderResults({
      status: 'loading',
      results: [],
      query: 'cardiac',
      onBack: jest.fn(),
      onRetry: jest.fn(),
      ...loadMoreDefaults,
    })

    // Assert
    expect(screen.getByRole('status')).toHaveTextContent(/loading results/i)
  })

  it('shows the total result count on success', async () => {
    // Arrange & Act
    await renderResults({
      status: 'success',
      results: [makeArticle()],
      query: 'cardiac',
      onBack: jest.fn(),
      onRetry: jest.fn(),
      ...loadMoreDefaults,
      total: 142,
    })

    // Assert
    expect(screen.getByText('142 results')).toBeInTheDocument()
  })

  it('formats a large result count with thousands separators', async () => {
    // Arrange & Act
    await renderResults({
      status: 'success',
      results: [makeArticle()],
      query: 'cardiac',
      onBack: jest.fn(),
      onRetry: jest.fn(),
      ...loadMoreDefaults,
      total: 102661,
    })

    // Assert
    expect(screen.getByText('102,661 results')).toBeInTheDocument()
  })

  it('uses singular wording for exactly one result', async () => {
    // Arrange & Act
    await renderResults({
      status: 'success',
      results: [makeArticle()],
      query: 'cardiac',
      onBack: jest.fn(),
      onRetry: jest.fn(),
      ...loadMoreDefaults,
      total: 1,
    })

    // Assert
    expect(screen.getByText('1 result')).toBeInTheDocument()
  })

  it('does not show a result count on non-success statuses', async () => {
    // Arrange & Act
    await renderResults({
      status: 'empty',
      results: [],
      query: 'zzznotreal',
      onBack: jest.fn(),
      onRetry: jest.fn(),
      ...loadMoreDefaults,
    })

    // Assert
    expect(screen.queryByText(/result(s)?$/i)).not.toBeInTheDocument()
  })

  it('renders the article list on success', async () => {
    // Arrange & Act
    await renderResults({
      status: 'success',
      results: [makeArticle({ title: 'Unique cardiac title' })],
      query: 'cardiac',
      onBack: jest.fn(),
      onRetry: jest.fn(),
      ...loadMoreDefaults,
    })

    // Assert
    expect(screen.getByRole('heading', { name: /unique cardiac title/i })).toBeInTheDocument()
  })

  it('renders the empty state with the query on empty', async () => {
    // Arrange & Act
    await renderResults({
      status: 'empty',
      results: [],
      query: 'zzznotreal',
      onBack: jest.fn(),
      onRetry: jest.fn(),
      ...loadMoreDefaults,
    })

    // Assert
    expect(screen.getByText(/no results found for 'zzznotreal'/i)).toBeInTheDocument()
  })

  it('renders the error state and wires retry on error', async () => {
    // Arrange
    const onRetry = jest.fn()
    await renderResults({
      status: 'error',
      results: [],
      query: 'cardiac',
      onBack: jest.fn(),
      onRetry,
      ...loadMoreDefaults,
    })

    // Act
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))

    // Assert
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('has no automatically detectable accessibility violations for each status', async () => {
    // Arrange
    const statuses: SearchStatus[] = ['loading', 'success', 'empty', 'error']

    for (const status of statuses) {
      const { container, unmount } = await renderResults({
        status,
        results: [makeArticle()],
        query: 'cardiac',
        onBack: jest.fn(),
        onRetry: jest.fn(),
        ...loadMoreDefaults,
      })

      // Act
      const results = await axe(container)

      // Assert
      expect(results).toHaveNoViolations()
      unmount()
    }
  })

  it('shows the Load more footer on success when more results are available', async () => {
    // Arrange & Act
    await renderResults({
      status: 'success',
      results: [makeArticle()],
      query: 'cardiac',
      onBack: jest.fn(),
      onRetry: jest.fn(),
      ...loadMoreDefaults,
      total: 40,
      hasMore: true,
    })

    // Assert
    expect(screen.getByText('Showing 1 of 40 results')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
  })

  it('calls onLoadMore when the Load more button is clicked', async () => {
    // Arrange
    const onLoadMore = jest.fn()
    await renderResults({
      status: 'success',
      results: [makeArticle()],
      query: 'cardiac',
      onBack: jest.fn(),
      onRetry: jest.fn(),
      ...loadMoreDefaults,
      total: 40,
      hasMore: true,
      onLoadMore,
    })

    // Act
    await userEvent.click(screen.getByRole('button', { name: /load more/i }))

    // Assert
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('does not show the Load more footer on non-success statuses', async () => {
    // Arrange & Act
    await renderResults({
      status: 'loading',
      results: [],
      query: 'cardiac',
      onBack: jest.fn(),
      onRetry: jest.fn(),
      ...loadMoreDefaults,
      total: 40,
      hasMore: true,
    })

    // Assert
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })
})
