# Issue 6: Multi-Stage Alpine Docker Build & GitLab CI/CD with GCP WIF

## What
Author the production multi-stage Dockerfile (Node 22 Vite build -> Cargo Chef Rust build -> minimal Alpine runner), configure `.gitlab-ci.yml` with Workload Identity Federation (WIF) keyless authentication, and automate Cloud Run deployment.

## Why
Enables automated, keyless, and reproducible deployments to Google Cloud Run within the perpetual free tier, packaging the frontend and backend into a single cohesive artifact.

## Acceptance Criteria
- [ ] Multi-stage `Dockerfile` authored with `cargo-chef` layer caching for rapid rebuilds.
- [ ] Production image built on `alpine:3.21` or distroless, stripped binary, size <30MB.
- [ ] Container memory usage under active load verified <30MB.
- [ ] Container cold start verified <50ms.
- [ ] `.gitlab-ci.yml` configured with `lint-test` and `build-deploy` stages.
- [ ] Keyless authentication via GCP Workload Identity Federation configured (zero stored service account keys).
- [ ] Cloud Run deployment flags set for perpetual free tier:
  - `--memory 256Mi`
  - `--cpu 1`
  - `--min-instances 0` (scale to zero)
  - `--max-instances 2`
  - `--concurrency 80`
  - `--timeout 15s`

## Layers Touched
- [ ] Container: `Dockerfile`, `.dockerignore`
- [ ] CI/CD: `.gitlab-ci.yml`
- [ ] Verification: Docker local build and container boot smoke test

## Edge Cases
- Dynamic SQLx query checking in Docker without live DB → `ENV SQLX_OFFLINE=true` with pre-generated `.sqlx` query metadata.
- Slow internet during npm build → `npm ci --prefer-offline` cached layer.
- Alpine musl compatibility → static linking with `musl-dev` ensures portable binary execution.

## Blocked By
- Issue 1, 2, 3, 4, 5 (All application code complete).

## Definition of Done
- [ ] Local `docker build` succeeds and produces an image under 30MB.
- [ ] Container runs locally with `docker run -p 8080:8080` and passes `/api/health`.
- [ ] GitLab CI configuration validates against GitLab CI linter.
