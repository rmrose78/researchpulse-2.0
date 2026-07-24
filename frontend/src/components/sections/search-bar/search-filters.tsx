import { useId, useState, type ChangeEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import type { SearchFilters as SearchFiltersValue } from '@/types'
import { JOURNAL_SUGGESTIONS } from '@/utils/journals'
import styles from './search-filters.module.scss'

interface SearchFiltersProps {
  filters: SearchFiltersValue
  onChange: (filters: SearchFiltersValue) => void
}

export default function SearchFilters({ filters, onChange }: SearchFiltersProps) {
  const [expanded, setExpanded] = useState(false)
  const panelId = useId()
  const journalListId = useId()

  function handleField(field: keyof SearchFiltersValue) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filters, [field]: event.target.value })
    }
  }

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((prev) => !prev)}
      >
        {expanded ? 'Hide filters' : 'Show filters'}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={styles.chevron}
          data-expanded={expanded}
        />
      </button>

      {expanded && (
        <fieldset id={panelId} className={styles.panel}>
          <legend className={styles.legend}>Refine your search</legend>

          <div className={styles.field}>
            <label htmlFor={`${panelId}-journal`}>Journal</label>
            <input
              id={`${panelId}-journal`}
              type="text"
              className={styles.input}
              list={journalListId}
              placeholder="e.g. The Lancet"
              value={filters.journal}
              onChange={handleField('journal')}
            />
            <datalist id={journalListId}>
              {JOURNAL_SUGGESTIONS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </datalist>
          </div>

          <div className={styles.field}>
            <label htmlFor={`${panelId}-date-from`}>From</label>
            <input
              id={`${panelId}-date-from`}
              type="date"
              className={styles.input}
              value={filters.date_from}
              onChange={handleField('date_from')}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor={`${panelId}-date-to`}>To</label>
            <input
              id={`${panelId}-date-to`}
              type="date"
              className={styles.input}
              value={filters.date_to}
              onChange={handleField('date_to')}
            />
          </div>
        </fieldset>
      )}
    </div>
  )
}
