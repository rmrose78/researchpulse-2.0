import { describe, it, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import RankHistoryNotice from './rank-history-notice'

describe('RankHistoryNotice', () => {
  it('explains that trend history is still being built', () => {
    // Arrange & Act
    render(<RankHistoryNotice />)

    // Assert
    expect(screen.getByRole('status')).toHaveTextContent(/doesn't have trend history yet/i)
  })

  it('has no automatically detectable accessibility violations', async () => {
    // Arrange
    const { container } = render(<RankHistoryNotice />)

    // Act
    const results = await axe(container)

    // Assert
    expect(results).toHaveNoViolations()
  })
})
