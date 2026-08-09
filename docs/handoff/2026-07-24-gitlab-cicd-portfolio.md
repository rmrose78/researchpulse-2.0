# Handoff: GitLab CI/CD as a portfolio showcase (2026-07-24)

## Why this exists

Idea surfaced in a side conversation about strengthening ResearchPulse (or
any portfolio project) as a hiring signal by demonstrating real CI/CD
automation, not just working code. Captured here for a future session
to act on if it fits current priorities.

## The idea

**GitLab Free tier is permanent, not a trial.** The 30-day trial only
covers paid "Ultimate" tier features (advanced AI agents, enterprise
compliance tooling). After 30 days the account just downgrades to
GitLab Free — no card required, no forced cutoff. Free tier includes:
- Built-in CI/CD pipelines
- 400 free compute minutes/month
- If minutes run out, a self-hosted GitLab Runner on a personal laptop
  can run pipeline jobs for free instead

## How to structure it for a portfolio project

1. **Keep the repo public** so recruiters can view it without logging in,
   with `.gitlab-ci.yml` sitting in the repo root.
2. **Pipeline status badge in the README** — GitLab generates a
   pass/fail badge; embedding it at the top of `README.md` is an
   immediate, visual proof the code builds and tests pass automatically.
3. **Multi-stage pipeline**, not a placeholder job. Realistic stages:
   - Lint (ESLint / Flake8)
   - Test (unit + integration)
   - Build (compile app / Docker image)
   - Deploy (auto-push to a free host — Netlify, GitHub Pages, AWS)
4. **Save build artifacts** (test reports, coverage maps, production
   build folder) to show understanding of passing compiled output
   between pipeline stages.
5. **Document the workflow in the README**, e.g.: "This project
   leverages GitLab CI/CD. Every push triggers a multi-stage pipeline
   that lints the code, runs tests, and auto-deploys on success."

## Relevance to ResearchPulse specifically

Not evaluated yet — this session didn't check whether ResearchPulse's
current GitHub-based workflow would move to GitLab, or whether this is
meant for a *different*, future portfolio project. Worth clarifying
before doing anything:
- ResearchPulse is currently on GitHub (deploy target: Netlify
  frontend + Railway backend/Postgres, per root `CLAUDE.md`). Moving
  CI to GitLab would mean either mirroring the repo or migrating it —
  a bigger decision than just adding a pipeline file.
- Alternative: keep ResearchPulse on GitHub Actions and treat GitLab
  CI/CD as a separate, smaller portfolio project built specifically to
  showcase this skill (a template repo in whatever language, e.g.
  Python or Node, matching the stack a target employer cares about).

## Questions for next session

- Is this meant to be applied to ResearchPulse itself, or a new/separate
  demo project?
- If separate: what language/stack should the example pipeline target?
- If GitHub Actions is already doing equivalent work here (lint/test/
  deploy), is there a reason to duplicate that in GitLab specifically,
  beyond demonstrating GitLab familiarity?
