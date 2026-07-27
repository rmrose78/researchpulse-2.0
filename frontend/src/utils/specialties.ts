// Mirrors backend/app/services/specialties.py — six curated clinical
// specialties, each backed by an explicit MeSH-scoped query server-side.
export interface Specialty {
  key: string
  label: string
}

export const SPECIALTIES: Specialty[] = [
  { key: 'cardiology', label: 'Cardiology' },
  { key: 'oncology', label: 'Oncology' },
  { key: 'infectious_disease', label: 'Infectious Disease' },
  { key: 'neurology', label: 'Neurology' },
  { key: 'alzheimers_dementia', label: "Alzheimer's & Dementia" },
  { key: 'public_health_policy', label: 'Public Health & Policy' },
]

// Default for a genuinely first-time visitor only — the sticky-selection
// fallback chain in use-trending.ts checks the URL param and localStorage
// first. Deliberately not SPECIALTIES[0] (Cardiology just happens to be
// first in the list); Public Health & Policy is the broadest, most
// generally-interesting specialty for a visitor with no established
// preference yet (issue #53).
export const DEFAULT_SPECIALTY = 'public_health_policy'
