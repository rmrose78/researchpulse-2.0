import { describe, it, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'jest-axe'
import EmptyState from './empty-state'

describe('EmptyState', () => {
  it('shows the friendly no-results message including the query', () => {
    // Arrange & Act
    render(<EmptyState query="cardiac" />)

    // Assert
    expect(screen.getByText(/no results found for 'cardiac' — try a different search term/i)).toBeInTheDocument()
  })

  it('shows a custom message when provided, ignoring query', () => {
    // Arrange & Act
    render(<EmptyState message="Your reading list is empty — save an article from search to see it here." />)

    // Assert
    expect(
      screen.getByText(/your reading list is empty — save an article from search to see it here\./i)
    ).toBeInTheDocument()
  })

  it('does not show an action link when none is provided', () => {
    // Arrange & Act
    render(<EmptyState query="cardiac" />)

    // Assert
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows an action link when actionLabel and actionTo are provided', () => {
    // Arrange & Act
    render(
      <MemoryRouter>
        <EmptyState message="Your reading list is empty." actionLabel="Search PubMed" actionTo="/search" />
      </MemoryRouter>
    )

    // Assert
    const link = screen.getByRole('link', { name: /search pubmed/i })
    expect(link).toHaveAttribute('href', '/search')
  })

  it('has no automatically detectable accessibility violations', async () => {
    // Arrange
    const { container } = render(<EmptyState query="cardiac" />)

    // Act
    const results = await axe(container)

    // Assert
    expect(results).toHaveNoViolations()
  })

  it('has no automatically detectable accessibility violations with an action link', async () => {
    // Arrange
    const { container } = render(
      <MemoryRouter>
        <EmptyState message="Your reading list is empty." actionLabel="Search PubMed" actionTo="/search" />
      </MemoryRouter>
    )

    // Act
    const results = await axe(container)

    // Assert
    expect(results).toHaveNoViolations()
  })
})
