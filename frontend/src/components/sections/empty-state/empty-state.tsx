import { Link } from 'react-router-dom'
import styles from './empty-state.module.scss'

interface EmptyStateProps {
  query?: string
  message?: string
  actionLabel?: string
  actionTo?: string
}

export default function EmptyState({ query, message, actionLabel, actionTo }: EmptyStateProps) {
  const text = message ?? `No results found for '${query}' — try a different search term`

  return (
    <div className={styles.container} role="status">
      <p className={styles.message}>{text}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo} className={styles.action}>
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
