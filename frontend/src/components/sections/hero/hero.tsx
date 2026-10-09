import type { ReactNode } from 'react'
import styles from './hero.module.scss'

interface HeroProps {
  heading?: string
  subtitle?: string
  children: ReactNode
}

const DEFAULT_HEADING = 'Trending biomedical research, ranked by citation velocity.'
const DEFAULT_SUBTITLE =
  "PubMed shows you everything. ResearchPulse shows you what's rising right now, and why."

export default function Hero({
  heading = DEFAULT_HEADING,
  subtitle = DEFAULT_SUBTITLE,
  children,
}: HeroProps) {
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.badge}>
        <span className={styles.pulseDot} aria-hidden="true" />
        <span>Biomedical Intelligence Engine</span>
      </div>
      <h1 id="hero-heading" className={styles.heading}>
        {heading}
      </h1>
      <p className={styles.subtitle}>{subtitle}</p>
      {children}
    </section>
  )
}
