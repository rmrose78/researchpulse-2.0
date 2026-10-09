#!/usr/bin/env bash
# ==============================================================================
# ResearchPulse: Automated GCP & Workload Identity Federation (WIF) Setup
# ==============================================================================
# This script automates 100% of the GCP infrastructure configuration required
# for keyless GitLab CI/CD and Cloud Run deployment on the perpetual free tier.
#
# Prerequisites:
#   1. Google Cloud SDK installed (`brew install --cask google-cloud-sdk`)
#   2. Logged in to GCP: `gcloud auth login`
# ==============================================================================

set -euo pipefail

# Configuration (Customize if desired)
PROJECT_ID="${1:-researchpulse-prod}"
REGION="us-central1"
REPO_NAME="researchpulse-repo"
SERVICE_ACCOUNT_NAME="gitlab-deployer"
WIF_POOL_NAME="gitlab-pool"
WIF_PROVIDER_NAME="gitlab-provider"
GITLAB_PROJECT_PATH="${2:-rmrose78/researchpulse}"

echo "========================================================"
echo "Starting Automated GCP Setup for: ${PROJECT_ID}"
echo "========================================================"

# 1. Set Active Project
echo "[1/6] Setting GCP project..."
gcloud config set project "${PROJECT_ID}"

# 2. Enable Required GCP APIs
echo "[2/6] Enabling Cloud Run, Artifact Registry & IAM APIs..."
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    iamcredentials.googleapis.com \
    cloudresourcemanager.googleapis.com

# 3. Create Artifact Registry Docker Repository
echo "[3/6] Creating Artifact Registry repository..."
if ! gcloud artifacts repositories describe "${REPO_NAME}" --location="${REGION}" &>/dev/null; then
    gcloud artifacts repositories create "${REPO_NAME}" \
        --repository-format=docker \
        --location="${REGION}" \
        --description="ResearchPulse Docker images"
    echo "Artifact Registry repository created."
else
    echo "Artifact Registry repository already exists."
fi

# 4. Create Service Account for GitLab CI
echo "[4/6] Creating Deployment Service Account..."
SA_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "${SA_EMAIL}" &>/dev/null; then
    gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
        --display-name="GitLab CI Deployer for ResearchPulse"
    echo "Service Account created: ${SA_EMAIL}"
else
    echo "Service Account already exists: ${SA_EMAIL}"
fi

# Grant Required Roles to Service Account
echo "Granting IAM roles to Service Account..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/run.admin" --quiet >/dev/null

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/artifactregistry.writer" --quiet >/dev/null

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/iam.serviceAccountUser" --quiet >/dev/null

# 5. Configure Workload Identity Federation (WIF) for Keyless Auth
echo "[5/6] Setting up Workload Identity Federation (Keyless)..."
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')

if ! gcloud iam workload-identity-pools describe "${WIF_POOL_NAME}" --location="global" &>/dev/null; then
    gcloud iam workload-identity-pools create "${WIF_POOL_NAME}" \
        --location="global" \
        --display-name="GitLab CI Pool"
fi

if ! gcloud iam workload-identity-pools providers describe "${WIF_PROVIDER_NAME}" \
    --workload-identity-pool="${WIF_POOL_NAME}" --location="global" &>/dev/null; then
    gcloud iam workload-identity-pools providers create-oidc "${WIF_PROVIDER_NAME}" \
        --workload-identity-pool="${WIF_POOL_NAME}" \
        --location="global" \
        --issuer-uri="https://gitlab.com" \
        --allowed-audiences="https://iam.googleapis.com" \
        --attribute-mapping="google.subject=assertion.sub,attribute.aud=assertion.aud,attribute.project_path=assertion.project_path"
fi

# Allow GitLab repo to impersonate Service Account
WIF_PROVIDER_FULL="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL_NAME}/providers/${WIF_PROVIDER_NAME}"

gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL_NAME}/attribute.project_path/${GITLAB_PROJECT_PATH}" \
    --quiet >/dev/null

# 6. Output GitLab CI/CD Variables
echo ""
echo "========================================================"
echo "GCP Setup Complete! Add these variables to GitLab CI/CD:"
echo "(GitLab > Project Settings > CI/CD > Variables)"
echo "========================================================"
echo "GCP_PROJECT_ID      : ${PROJECT_ID}"
echo "GCP_SERVICE_ACCOUNT : ${SA_EMAIL}"
echo "GCP_WIF_PROVIDER    : ${WIF_PROVIDER_FULL}"
echo "========================================================"
