#!/usr/bin/env bash
# =============================================================================
# deploy.sh – Production deployment script for Skillpal / ListingHub
#
# Usage (run as root on the server, or via sudo):
#   bash /var/www/skillpal/deploy/deploy.sh
#
# The GitHub Actions workflow calls the SSH steps directly and does not
# invoke this script, but it is kept here so you can trigger a manual
# re-deploy from the server without going through GitHub Actions.
# =============================================================================

set -euo pipefail   # exit on error, unset variable, or pipe failure

APP_ROOT="/var/www/skillpal"
LOG_FILE="/var/log/skillpal-deploy.log"
TIMESTAMP="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# ── Logging helper ────────────────────────────────────────────────────────────
log() {
  echo "[${TIMESTAMP}] $*" | tee -a "$LOG_FILE"
}

log "========================================================"
log " Manual deployment started"
log "========================================================"

# ── 1. Pull latest code ───────────────────────────────────────────────────────
log "[1/4] Pulling latest code from origin/main..."
cd "$APP_ROOT"

# If you have a GitHub PAT stored in an env file, source it before running
# this script:  source /etc/skillpal/secrets && bash deploy/deploy.sh
if [[ -n "${GITHUB_PAT:-}" ]]; then
  git remote set-url origin \
    "https://${GITHUB_PAT}@github.com/designdigistratics-dotcom/listing-hub.git"
fi

git fetch origin main
git reset --hard origin/main

# ── 2. Build backend ──────────────────────────────────────────────────────────
log "[2/4] Building backend (TypeScript -> dist/)..."
cd "$APP_ROOT/backend"

# Install all deps including devDependencies (needed for tsc)
npm ci

# Regenerate Prisma client in case schema changed
npx prisma generate

# Compile TypeScript
npm run build

# ── 3. Build frontend ─────────────────────────────────────────────────────────
log "[3/4] Building frontend (Next.js)..."
cd "$APP_ROOT/frontend"

# Install all deps (next build needs them)
npm ci

# Build the Next.js app.
# NEXT_PUBLIC_* variables must be set in the shell environment before
# running this script if you are doing a full local build on the server.
npm run build

# ── 4. Restart PM2 ────────────────────────────────────────────────────────────
log "[4/4] Restarting PM2 processes..."

pm2 restart skillpal-backend
pm2 restart skillpal-frontend

# Persist the process list so PM2 restores it after a system reboot
pm2 save

log "========================================================"
log " Deployment complete"
log "========================================================"
