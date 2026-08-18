#!/usr/bin/env bash
#
# pre-deploy-check.sh — run this before every push you're about to deploy.
#
# Checks the two things that are cheap to catch locally and expensive to
# discover from a failed Vercel build: does the code actually compile/lint/
# build, and are the env vars the app hard-depends on at runtime actually
# set. It does NOT touch Vercel, Stripe, or your database — see DEPLOY.md
# for the manual steps this script can't safely automate (production
# migrations, the Stripe webhook endpoint, promoting your admin account).
#
# Usage: ./scripts/pre-deploy-check.sh
# Exit code: 0 if everything passed, 1 if anything failed.

set -uo pipefail

# Always run from the project root, regardless of where this script was
# invoked from — this file lives in scripts/, so the root is one level up.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Colors, but only if stdout is a real terminal — a plain log file or CI
# viewer shouldn't get raw escape codes.
if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BOLD='\033[1m'; RESET='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BOLD=''; RESET=''
fi

PASS_COUNT=0
FAIL_COUNT=0
declare -a FAILED_STEPS=()

# Runs one check, prints a live status line, and records pass/fail for the
# summary at the end — every check runs regardless of earlier failures, so
# one run tells you everything that's wrong, not just the first thing.
run_check() {
  local name="$1"
  shift
  echo ""
  echo "${BOLD}▸ ${name}${RESET}"
  if "$@"; then
    echo "${GREEN}✓ ${name}${RESET}"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "${RED}✗ ${name}${RESET}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_STEPS+=("$name")
  fi
}

echo "${BOLD}Halina — pre-deploy readiness check${RESET}"
echo "Project root: $(pwd)"

# --- 1. Type-check -----------------------------------------------------
run_check "Type-check (tsc --noEmit)" npx tsc --noEmit -p .

# --- 2. Lint -------------------------------------------------------------
run_check "Lint (eslint)" npx eslint .

# --- 3. Production build --------------------------------------------------
# This is the same build Vercel itself runs — catching a build-only failure
# (as opposed to a type/lint issue) here is exactly the point of this
# script: it takes seconds locally, a full round trip on Vercel.
run_check "Production build (next build)" npm run build

# --- 4. Required env vars -------------------------------------------------
# These four are the ones this app hard-depends on at runtime (see
# DEPLOY.md section 1 for the full reasoning on why each one is required
# rather than optional-with-a-fallback). Checked against .env.local first
# (what Next.js itself reads locally), falling back to whatever's already
# exported in this shell (covers `vercel env pull`-style workflows too).
REQUIRED_VARS=(DATABASE_URL AUTH_SECRET STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET)
ENV_FILE=".env.local"

# Reads one KEY from a .env-style file, stripping surrounding quotes —
# handles both KEY="value" and KEY=value without pulling in a real .env
# parser dependency for four lines of work.
read_env_var() {
  local key="$1"
  local file="$2"
  [ -f "$file" ] || return 1
  local line
  line=$(grep -E "^${key}=" "$file" | tail -n 1)
  [ -n "$line" ] || return 1
  local value="${line#*=}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  echo "$value"
}

check_env_vars() {
  local all_set=0
  for var in "${REQUIRED_VARS[@]}"; do
    local value=""
    # Shell-exported value wins if present (e.g. from `vercel env pull`),
    # otherwise fall back to reading .env.local directly.
    if [ -n "${!var:-}" ]; then
      value="${!var}"
    else
      value="$(read_env_var "$var" "$ENV_FILE")"
    fi
    if [ -z "$value" ]; then
      echo "  ${RED}missing:${RESET} $var"
      all_set=1
    else
      echo "  ${GREEN}set:${RESET} $var"
    fi
  done
  return $all_set
}
run_check "Required env vars set ($ENV_FILE or shell)" check_env_vars

# --- Summary ---------------------------------------------------------------
echo ""
echo "${BOLD}────────────────────────────────────────${RESET}"
if [ "$FAIL_COUNT" -eq 0 ]; then
  echo "${GREEN}${BOLD}All $PASS_COUNT checks passed.${RESET}"
  echo "This covers the automatable half of readiness — DEPLOY.md still has"
  echo "manual steps this script can't do for you (production migrations,"
  echo "the Stripe webhook endpoint, promoting your admin account)."
  exit 0
else
  echo "${RED}${BOLD}${FAIL_COUNT} check(s) failed${RESET} (${PASS_COUNT} passed):"
  for step in "${FAILED_STEPS[@]}"; do
    echo "  ${RED}✗${RESET} $step"
  done
  echo ""
  echo "Fix these before pushing — a failing build here will fail the exact"
  echo "same way on Vercel, just slower to find out."
  exit 1
fi
