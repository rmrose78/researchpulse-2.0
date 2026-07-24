import styles from './rank-history-notice.module.scss'

export default function RankHistoryNotice() {
  return (
    <p className={styles.notice} role="status">
      This view doesn't have trend history yet — check back after our next
      update to see what's climbing or dropping.
    </p>
  )
}
