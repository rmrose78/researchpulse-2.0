import { DEFAULT_SPECIALTY, SPECIALTIES } from './specialties'

describe('specialties', () => {
  it('defaults a first-time visitor (no URL param, no localStorage) to Public Health & Policy', () => {
    // Arrange & Act
    const defaultEntry = SPECIALTIES.find((s) => s.key === DEFAULT_SPECIALTY)

    // Assert
    expect(DEFAULT_SPECIALTY).toBe('public_health_policy')
    expect(defaultEntry?.label).toBe('Public Health & Policy')
  })

  it('keeps the default a valid, listed specialty', () => {
    // Arrange & Act
    const keys = SPECIALTIES.map((s) => s.key)

    // Assert
    expect(keys).toContain(DEFAULT_SPECIALTY)
  })
})
