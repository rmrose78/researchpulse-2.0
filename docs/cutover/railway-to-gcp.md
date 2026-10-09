# Railway to Google Cloud Run Migration & Cutover Guide

This document provides step-by-step instructions for completing the deployment of ResearchPulse 2.0 to Google Cloud Platform's perpetual free tier and safely decommissioning the paid Railway instance.

---

## 1. Automated GCP Infrastructure Setup

Run the automated infrastructure provisioning script from the repository root:

```bash
chmod +x ./scripts/setup-gcp.sh
./scripts/setup-gcp.sh <YOUR_GCP_PROJECT_ID> rmrose78/researchpulse
```

This script automatically:
1. Enables Cloud Run, Artifact Registry, IAM Credentials, and Cloud Resource Manager APIs.
2. Creates the Artifact Registry Docker repository (`researchpulse-repo`) in `us-central1`.
3. Creates the dedicated Service Account (`gitlab-deployer`).
4. Configures keyless Google Cloud Workload Identity Federation (WIF) mapped to your GitLab repository.
5. Prints the exact CI/CD variables needed for GitLab.

---

## 2. GitLab CI/CD Variables Configuration

In GitLab, navigate to:
**Settings > CI/CD > Variables > Add Variable**

Configure the following:

| Variable | Description | Masked / Protected |
| :--- | :--- | :--- |
| `GCP_PROJECT_ID` | Your GCP Project ID | Yes |
| `GCP_SERVICE_ACCOUNT` | `gitlab-deployer@<PROJECT_ID>.iam.gserviceaccount.com` | Yes |
| `GCP_WIF_PROVIDER` | `projects/<NUM>/locations/global/workloadIdentityPools/gitlab-pool/providers/gitlab-provider` | Yes |
| `DATABASE_URL` | Serverless Postgres connection string (Neon / Supabase free tier) | Masked & Protected |
| `NCBI_API_KEY` | (Optional) PubMed API key for 10 req/s | Masked |
| `SEMANTIC_SCHOLAR_API_KEY` | (Optional) Semantic Scholar API key | Masked |
| `ANALYTICS_SECRET_KEY` | Secret key protecting the `/api/analytics/summary` endpoint | Masked & Protected |

---

## 3. Deploy via GitLab CI/CD

Push your `main` branch to GitLab:

```bash
git push origin main
```

The `.gitlab-ci.yml` pipeline will:
1. Run `cargo clippy`, `cargo fmt`, and `cargo test` in the test stage.
2. Build the multi-stage Docker image packaging both React 19 frontend and the Rust Axum backend.
3. Authenticate to GCP keylessly via Workload Identity Federation.
4. Push the image to Artifact Registry and deploy to Cloud Run with perpetual free-tier settings:
   - `--memory 256Mi`
   - `--cpu 1`
   - `--min-instances 0` (scales to zero when idle)
   - `--max-instances 2`
   - `--concurrency 80`
   - `--timeout 15s`

---

## 4. Custom Domain & DNS Cutover

1. In the Google Cloud Console:
   - Go to **Cloud Run > Custom Domains**.
   - Click **Add Mapping** and select service `researchpulse`.
   - Enter your domain (e.g., `researchpulse.org` or `app.researchpulse.org`).
2. Update your DNS registrar:
   - Point your DNS records (A/AAAA or CNAME) to Google's provided records.
   - Google automatically provisions and renews managed SSL/TLS certificates.

---

## 5. Railway Decommissioning & Cancellation

Once your live domain is serving ResearchPulse 2.0 with 200 OK:

1. Log in to [Railway Dashboard](https://railway.app/dashboard).
2. Select your `researchpulse` project.
3. Navigate to **Settings > Delete Project**.
4. Confirm deletion.
5. In **Account Settings > Billing**, verify that your active services show \$0.00 and no active compute resources exist.

---

## 6. Verification Checklist

- [ ] `GET /api/health` returns `200 OK` with database `ok`.
- [ ] SPA root `/*` loads the React 19 interface with zero CORS errors.
- [ ] Search query executes and returns PubMed articles.
- [ ] Trending page displays velocity badges, evidence tiers, and rank movements.
- [ ] Bookmarking an article saves it to the reading list and loads citation counts.
- [ ] Pageview analytics log correctly.
- [ ] Railway service is deleted; monthly billing is \$0.00.
