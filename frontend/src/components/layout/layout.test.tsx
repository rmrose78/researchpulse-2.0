import { describe, it, expect, jest } from '@jest/globals'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'jest-axe'
import Layout from './layout'

// Layout mounts the page-view tracking hook — stub it out here so these tests
// stay focused on nav/landmark structure, not network calls.
jest.mock('@/utils/api', () => ({
  postPageView: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}))

function renderLayout(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Layout>
        <p>Page content</p>
      </Layout>
    </MemoryRouter>
  )
}

describe('Layout', () => {
  it('renders nav and main landmarks with a working skip link', () => {
    // Arrange
    renderLayout()

    // Act
    const skipLink = screen.getByRole('link', { name: /skip to main content/i })
    const main = screen.getByRole('main')

    // Assert
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: /primary/i })
    ).toBeInTheDocument()
    expect(skipLink).toHaveAttribute('href', `#${main.id}`)
    expect(screen.getByText('Page content')).toBeInTheDocument()
  })

  it('nav is wrapped in a header landmark, and the brand links home', () => {
    // Arrange
    renderLayout()

    // Act
    const header = screen.getByRole('banner')
    const nav = screen.getByRole('navigation', { name: /primary/i })
    const brandLink = screen.getByRole('link', { name: /researchpulse home/i })

    // Assert
    expect(header).toContainElement(nav)
    expect(nav).toContainElement(brandLink)
    expect(brandLink).toHaveAttribute('href', '/')
  })

  it('renders nav links to trending, search, reading list, and how it works, with the brand also covering home', () => {
    // Arrange
    renderLayout()

    // Act & Assert
    expect(screen.getByRole('link', { name: /^trending$/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /^search pubmed$/i })).toHaveAttribute('href', '/search')
    expect(screen.getByRole('link', { name: /^reading list$/i })).toHaveAttribute(
      'href',
      '/reading-list'
    )
    const nav = screen.getByRole('navigation', { name: /primary/i })
    expect(within(nav).getByRole('link', { name: /how it works/i })).toHaveAttribute(
      'href',
      '/how-it-works'
    )
  })

  it('renders a footer link to how it works alongside the copyright notice', () => {
    // Arrange
    renderLayout()

    // Act
    const footer = screen.getByRole('contentinfo')
    const footerLink = within(footer).getByRole('link', { name: /how it works/i })

    // Assert
    expect(footerLink).toHaveAttribute('href', '/how-it-works')
    expect(footer).toHaveTextContent(/researchpulse/i)
  })

  it('renders GitHub and LinkedIn links in the footer that open in a new tab safely', () => {
    // Arrange
    renderLayout()

    // Act
    const footer = screen.getByRole('contentinfo')
    const githubLink = within(footer).getByRole('link', { name: /view source on github/i })
    const linkedinLink = within(footer).getByRole('link', { name: /ryan rose on linkedin/i })

    // Assert
    expect(githubLink).toHaveAttribute('href', 'https://github.com/rmrose78/researchpulse')
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
    expect(linkedinLink).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/ryan-rose-272626170/'
    )
    expect(linkedinLink).toHaveAttribute('target', '_blank')
    expect(linkedinLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('marks the brand and the trending link as active via aria-current on the trending route, and no others', () => {
    // Arrange
    renderLayout('/')

    // Act
    const brandLink = screen.getByRole('link', { name: /researchpulse home/i })
    const trendingLink = screen.getByRole('link', { name: /^trending$/i })
    const readingListLink = screen.getByRole('link', { name: /^reading list$/i })

    // Assert
    expect(brandLink).toHaveAttribute('aria-current', 'page')
    expect(trendingLink).toHaveAttribute('aria-current', 'page')
    expect(readingListLink).not.toHaveAttribute('aria-current')
  })

  it('renders a footer landmark with a copyright notice', () => {
    // Arrange
    renderLayout()

    // Act
    const footer = screen.getByRole('contentinfo')

    // Assert
    expect(footer).toHaveTextContent(/researchpulse/i)
  })

  it('has no automatically detectable accessibility violations', async () => {
    // Arrange
    const { container } = renderLayout()

    // Act
    const results = await axe(container)

    // Assert
    expect(results).toHaveNoViolations()
  })

  it('renders a hamburger trigger that opens a full-screen nav overlay with all nav links', async () => {
    // Arrange
    renderLayout()

    // Act
    await userEvent.click(screen.getByRole('button', { name: /open menu/i }))

    // Assert
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('link', { name: /^trending$/i })).toHaveAttribute('href', '/')
    expect(within(dialog).getByRole('link', { name: /^search pubmed$/i })).toHaveAttribute(
      'href',
      '/search'
    )
    expect(within(dialog).getByRole('link', { name: /^reading list$/i })).toHaveAttribute(
      'href',
      '/reading-list'
    )
    expect(within(dialog).getByRole('link', { name: /how it works/i })).toHaveAttribute(
      'href',
      '/how-it-works'
    )
  })

  it('closes the nav overlay after clicking a link inside it', async () => {
    // Arrange
    renderLayout()
    await userEvent.click(screen.getByRole('button', { name: /open menu/i }))
    const dialog = await screen.findByRole('dialog')

    // Act
    await userEvent.click(within(dialog).getByRole('link', { name: /^reading list$/i }))

    // Assert
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
