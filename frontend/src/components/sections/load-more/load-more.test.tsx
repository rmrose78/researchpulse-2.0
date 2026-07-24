import { describe, it, expect, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import LoadMore from './load-more'

describe('LoadMore', () => {
  it('shows the progress count', () => {
    // Arrange & Act
    render(
      <LoadMore
        total={40}
        loadedCount={20}
        hasMore
        isLoading={false}
        error={null}
        onLoadMore={jest.fn()}
      />
    )

    // Assert
    expect(screen.getByText('Showing 20 of 40 results')).toBeInTheDocument()
  })

  it('formats large counts with thousands separators', () => {
    // Arrange & Act
    render(
      <LoadMore
        total={102661}
        loadedCount={20}
        hasMore
        isLoading={false}
        error={null}
        onLoadMore={jest.fn()}
      />
    )

    // Assert
    expect(screen.getByText('Showing 20 of 102,661 results')).toBeInTheDocument()
  })

  it('renders nothing when total is 0', () => {
    // Arrange & Act
    const { container } = render(
      <LoadMore total={0} loadedCount={0} hasMore={false} isLoading={false} error={null} onLoadMore={jest.fn()} />
    )

    // Assert
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the Load more button when more results are available', () => {
    // Arrange & Act
    render(
      <LoadMore total={40} loadedCount={20} hasMore isLoading={false} error={null} onLoadMore={jest.fn()} />
    )

    // Assert
    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
  })

  it('hides the Load more button once all results are loaded', () => {
    // Arrange & Act
    render(
      <LoadMore
        total={20}
        loadedCount={20}
        hasMore={false}
        isLoading={false}
        error={null}
        onLoadMore={jest.fn()}
      />
    )

    // Assert
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })

  it('calls onLoadMore when the button is clicked', async () => {
    // Arrange
    const onLoadMore = jest.fn()
    render(
      <LoadMore total={40} loadedCount={20} hasMore isLoading={false} error={null} onLoadMore={onLoadMore} />
    )

    // Act
    await userEvent.click(screen.getByRole('button', { name: /load more/i }))

    // Assert
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('shows an inline spinner and disables the button while loading', () => {
    // Arrange & Act
    render(
      <LoadMore total={40} loadedCount={20} hasMore isLoading error={null} onLoadMore={jest.fn()} />
    )

    // Assert
    const button = screen.getByRole('button', { name: /loading more results/i })
    expect(button).toBeDisabled()
  })

  it('shows an inline error with a retry action instead of the button, keeping results untouched', async () => {
    // Arrange
    const onLoadMore = jest.fn()
    render(
      <LoadMore
        total={40}
        loadedCount={20}
        hasMore
        isLoading={false}
        error="Couldn't reach PubMed to load more results — this may be a temporary rate limit."
        onLoadMore={onLoadMore}
      />
    )

    // Assert
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn't reach pubmed/i)
    expect(screen.queryByRole('button', { name: /^load more$/i })).not.toBeInTheDocument()

    // Act
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))

    // Assert
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('has no automatically detectable accessibility violations — default state', async () => {
    // Arrange
    const { container } = render(
      <LoadMore total={40} loadedCount={20} hasMore isLoading={false} error={null} onLoadMore={jest.fn()} />
    )

    // Act
    const results = await axe(container)

    // Assert
    expect(results).toHaveNoViolations()
  })

  it('has no automatically detectable accessibility violations — loading state', async () => {
    // Arrange
    const { container } = render(
      <LoadMore total={40} loadedCount={20} hasMore isLoading error={null} onLoadMore={jest.fn()} />
    )

    // Act
    const results = await axe(container)

    // Assert
    expect(results).toHaveNoViolations()
  })

  it('has no automatically detectable accessibility violations — error state', async () => {
    // Arrange
    const { container } = render(
      <LoadMore
        total={40}
        loadedCount={20}
        hasMore
        isLoading={false}
        error="Couldn't reach PubMed to load more results."
        onLoadMore={jest.fn()}
      />
    )

    // Act
    const results = await axe(container)

    // Assert
    expect(results).toHaveNoViolations()
  })

  it('has no automatically detectable accessibility violations — fully loaded state', async () => {
    // Arrange
    const { container } = render(
      <LoadMore
        total={20}
        loadedCount={20}
        hasMore={false}
        isLoading={false}
        error={null}
        onLoadMore={jest.fn()}
      />
    )

    // Act
    const results = await axe(container)

    // Assert
    expect(results).toHaveNoViolations()
  })
})
