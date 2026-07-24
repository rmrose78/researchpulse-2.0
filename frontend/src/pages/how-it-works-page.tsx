import { ArrowUpDown, Award, Database, Filter, ListFilter, RefreshCw, TrendingUp } from 'lucide-react'
import styles from './how-it-works-page.module.scss'

export default function HowItWorksPage() {
  return (
    <section className={styles.section} aria-labelledby="how-it-works-heading">
      <h1 id="how-it-works-heading" className={styles.heading}>
        How It Works
      </h1>
      <p className={styles.subtitle}>
        What ResearchPulse pulls from, how trending is ranked, and what the numbers mean.
      </p>

      <div className={styles.cards}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <Database size={20} aria-hidden="true" className={styles.icon} />
            <h2 className={styles.cardTitle}>Data Sources</h2>
          </div>
          <p>
            Articles come from <strong>PubMed</strong>, the National Library of Medicine&rsquo;s
            biomedical literature index. Citation counts come from{' '}
            <strong>Semantic Scholar</strong>, a free academic graph that links papers to who&rsquo;s
            citing them.
          </p>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <ListFilter size={20} aria-hidden="true" className={styles.icon} />
            <h2 className={styles.cardTitle}>Ranking Modes</h2>
          </div>
          <p>
            The Mode filter switches between three independent rankings of the same underlying
            articles:
          </p>
          <p>
            <strong>Trending</strong> sorts by citation velocity (see below) — what&rsquo;s
            picking up citations fast, relative to its age. <strong>Most Cited</strong> sorts by
            raw citation count, no recency weighting at all. <strong>New &amp; Notable</strong>{' '}
            sorts by publication date, boosted by evidence tier (see below) so a high-quality
            brand-new study surfaces before it&rsquo;s had time to accumulate citations.
          </p>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <Filter size={20} aria-hidden="true" className={styles.icon} />
            <h2 className={styles.cardTitle}>Specialties &amp; Time Range</h2>
          </div>
          <p>
            Trending is split into six clinical specialties, each mapped to a MeSH search query.
            You choose how far back to look — 60 days, 6 months, 1 year, or 2 years — and that
            choice is exactly what gets queried; results are never silently widened past what you
            picked. Specialty, time range, and ranking mode are three independent filters — mix
            them however you like.
          </p>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <TrendingUp size={20} aria-hidden="true" className={styles.icon} />
            <h2 className={styles.cardTitle}>Citation Velocity</h2>
          </div>
          <p>Velocity measures how fast an article is being cited relative to its age:</p>
          <p className={styles.formulaLine}>
            <code className={styles.chip}>citations ÷ (days since publication + 21)</code>
          </p>
          <p>
            The <strong>+21</strong> is a three-week smoothing constant. Without it, a 2-day-old
            article with a single citation (<code className={styles.chip}>1 ÷ 23 ≈ 0.04</code>)
            could edge out a more established one purely from a tiny denominator. A 60-day-old
            article with 5 citations scores meaningfully higher (
            <code className={styles.chip}>5 ÷ 81 ≈ 0.06</code>) — favoring articles that have had
            real time to accumulate citations over an early, possibly lucky one.
          </p>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <Award size={20} aria-hidden="true" className={styles.icon} />
            <h2 className={styles.cardTitle}>Notability</h2>
          </div>
          <p>
            New &amp; Notable is sorted by publication date, but a date alone doesn&rsquo;t say
            anything about how much weight to put on a brand-new finding — so we add a real
            signal: the kind of study it is, straight from PubMed&rsquo;s own metadata.
          </p>
          <p className={styles.formulaLine}>
            <code className={styles.chip}>Meta-Analysis / Systematic Review</code>
            {' > '}
            <code className={styles.chip}>Randomized Controlled Trial</code>
            {' > '}
            <code className={styles.chip}>Clinical Trial / Multicenter / Comparative Study</code>
          </p>
          <p>
            This mirrors the evidence hierarchy used in clinical practice. Articles matching one
            of these types get a badge and rank above everything else in the window; other
            articles (plain journal articles, case reports, editorials) show no badge and fall
            back to recency order.
          </p>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <ArrowUpDown size={20} aria-hidden="true" className={styles.icon} />
            <h2 className={styles.cardTitle}>Rank-Movement Badges</h2>
          </div>
          <p>
            Each card can carry a small badge next to its title, showing how its position changed
            since the last update:
          </p>
          <p className={styles.formulaLine}>
            <code className={styles.chip}>↑N / ↓N</code> — moved up or down N spots
            {'  '}
            <code className={styles.chip}>NEW</code> — wasn&rsquo;t ranked here at all last time
          </p>
          <p>
            A view needs two updates to compare before any badge can appear. If a specialty, mode,
            and time-range combination is still building that history, you&rsquo;ll see a short
            note saying so instead of badges — that&rsquo;s expected, not a bug, and it resolves
            itself on the next scheduled update.
          </p>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <RefreshCw size={20} aria-hidden="true" className={styles.icon} />
            <h2 className={styles.cardTitle}>Freshness &amp; Caching</h2>
          </div>
          <p>
            Citation data isn&rsquo;t looked up live on every visit. Results are cached for a few
            hours and refreshed periodically in the background — that&rsquo;s what the &ldquo;Updated
            X ago&rdquo; note next to the results means.
          </p>
        </article>
      </div>
    </section>
  )
}
