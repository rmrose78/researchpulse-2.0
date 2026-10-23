# Issue 8: UI/UX Modernization, Overflow Fix, Proxy Bypass & Legacy Python Decommissioning

## What
Modernize the ResearchPulse frontend design system (cards, selectors, atmospheric hero illumination, metadata pills), fix the horizontal container overflow in the Mode selector, ensure Rust HTTP clients bypass local proxies to maintain reliable upstream connectivity to NCBI PubMed and Semantic Scholar, and decommission all obsolete Python backend code from the 2.0 repository.

## Why
1. Complete the visual and user experience evolution of ResearchPulse 2.0 with responsive typography, cohesive executive styling, and zero layout overflow defects.
2. Ensure robust, uninterrupted data flow from biomedical APIs across all local and container environments.
3. Clean the repository of legacy Python artifacts so that GitHub language metrics accurately reflect ResearchPulse 2.0 as a pure Rust and TypeScript application.

## Acceptance Criteria
- [x] **Mode Selector Layout Fix**:
  - Replace horizontal `flex-direction: row` with a vertical segmented control stack (`flex-direction: column; width: 100%`).
  - Eliminate the ~35px container breach on the `New & Notable` option.
- [x] **Visual Design System & Hierarchy**:
  - Modernize article cards with 14px radius, soft drop shadows, circular bookmark micro-interactions, and sleek expanders.
  - Restore clinical blue styling for citation count badges to avoid visual collision with green positive rank velocity indicators.
  - Upgrade freshness row into a clean executive metadata pill badge.
  - Enhance hero section with live status indicator pill and radial illumination backdrop.
- [x] **HTTP Client Reliability**:
  - Configure `.no_proxy()` on `EntrezClient` and `SemanticScholarClient` to prevent TLS handshake failures behind local development proxies.
  - Update `get_trending` to recompute synchronously if a cached snapshot has zero articles.
- [x] **Legacy Python Decommissioning**:
  - Remove all 51 obsolete Python files in `legacy_backend/` (4,103 lines of Python).
  - Update `.gitignore` and `.dockerignore`.
  - Drop Python language ratio on GitHub to 0%.
- [x] **Verification**:
  - 24/24 Rust tests pass (`cargo test -- -q`).
  - 324/324 frontend tests pass (`npm test`).
  - Clean production build (`npm run build`).

## Layers Touched
- [x] Frontend UI/UX: `frontend/src/components/sections/` (mode-selector, specialty-selector, time-range-selector, article-card, hero, search-bar, reading-list)
- [x] Backend Services: `backend/src/services/` (entrez, semantic_scholar, trending)
- [x] Repository Cleanup: `legacy_backend/`, `.gitignore`, `.dockerignore`

## Definition of Done
- [x] Headless Chrome visual verification confirms zero container overflow and live biomedical data rendering.
- [x] Feature branch pushed to GitHub and linked to Issue ticket.
- [x] Main branch tracking clean.
