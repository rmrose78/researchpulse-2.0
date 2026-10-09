import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { usePageViewTracking } from '@/hooks/use-pageview-tracking'
import MobileNav from './mobile-nav/mobile-nav'
import GithubIcon from './github-icon'
import LinkedinIcon from './linkedin-icon'
import { NAV_ITEMS } from './nav-items'
import styles from './layout.module.scss'

interface LayoutProps {
  children: ReactNode
}

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
}

export default function Layout({ children }: LayoutProps) {
  usePageViewTracking()

  return (
    <div className={styles.page}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Primary">
          <NavLink to="/" end className={styles.brand} aria-label="ResearchPulse home">
            <img src="/logo-full-v2.svg" alt="" className={styles.brandLogo} height={48} />
          </NavLink>
          <ul className={styles.navLinks}>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={navLinkClassName}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <MobileNav />
        </nav>
      </header>
      <main id="main-content" className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} ResearchPulse</p>
        <NavLink to="/how-it-works" className={styles.footerLink}>
          How It Works
        </NavLink>
        <div className={styles.footerSignature}>
          <span className={styles.authorText}>Created by Ryan Rose</span>
          <span className={styles.signatureDivider} aria-hidden="true">•</span>
          <div className={styles.footerSocial}>
            <a
              href="https://www.linkedin.com/in/ryan-rose-272626170/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ryan Rose on LinkedIn"
              className={styles.socialLink}
            >
              <LinkedinIcon />
            </a>
            <a
              href="https://github.com/rmrose78/researchpulse-2.0"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
              className={styles.socialLink}
            >
              <GithubIcon />
            </a>
          </div>
        </div>
      </footer>

    </div>
  )
}

