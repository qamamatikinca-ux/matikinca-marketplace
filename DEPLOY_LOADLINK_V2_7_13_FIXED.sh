#!/usr/bin/env bash
set -Eeuo pipefail

say() { printf '\n== %s ==\n' "$1"; }
die() { printf '\nERROR: %s\n' "$1" >&2; exit 1; }

SOURCE_REPO=""

if ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  if git -C "$ROOT" remote get-url origin 2>/dev/null | grep -Eq 'qamamatikinca-ux/matikinca-marketplace(\.git)?$'; then
    SOURCE_REPO="$ROOT"
  fi
fi

if [[ -z "$SOURCE_REPO" && -d /workspaces ]]; then
  while IFS= read -r candidate; do
    [[ -d "$candidate/.git" || -f "$candidate/.git" ]] || continue
    remote="$(git -C "$candidate" remote get-url origin 2>/dev/null || true)"
    if printf '%s' "$remote" | grep -Eq 'qamamatikinca-ux/matikinca-marketplace(\.git)?$'; then
      SOURCE_REPO="$candidate"
      break
    fi
  done < <(find /workspaces -mindepth 1 -maxdepth 1 -type d -print 2>/dev/null)
fi

[[ -n "$SOURCE_REPO" ]] || die "Could not find the qamamatikinca-ux/matikinca-marketplace Codespace."

say "Fetching current LoadLink main"
git -C "$SOURCE_REPO" fetch --prune origin main

TMP_ROOT="$(mktemp -d /tmp/loadlink-v2713-deploy-XXXXXX)"
DEPLOY_REPO="$TMP_ROOT/repo"

cleanup() {
  git -C "$SOURCE_REPO" worktree remove --force "$DEPLOY_REPO" >/dev/null 2>&1 || true
  rm -rf "$TMP_ROOT" >/dev/null 2>&1 || true
}
trap cleanup EXIT

say "Creating clean production worktree"
git -C "$SOURCE_REPO" worktree add --detach "$DEPLOY_REPO" origin/main >/dev/null
cd "$DEPLOY_REPO"

say "Verifying the exact fixes"
grep -Fq 'setLogisticsWorkspaceOpen(true)' app/messages/page.tsx || die "In-chat Logistics Tools open state is missing."
grep -Fq 'if (selectedConversation && logisticsWorkspaceOpen)' app/messages/page.tsx || die "Messages takeover render is missing."
if grep -Fq 'window.location.assign(`/tools?from=messages' app/messages/page.tsx; then
  die "Wrong standalone /tools routing is still present."
fi
grep -Fq 'if (mode === "checking") return null;' app/auth/mfa/page.tsx || die "MFA no-flash guard is missing."
grep -Fq 'loadlink_security_code_status' lib/authSecurity.ts || die "Security-code status check is missing."

export VERCEL_ORG_ID="team_ltBsujLbhqOPqX4dlpWDHial"
export VERCEL_PROJECT_ID="prj_3qeAZGhTEQcQUtFQm9r70suN1Xzt"

VC=(npx --yes vercel@latest)

say "Checking Vercel login"
if ! "${VC[@]}" whoami >/dev/null 2>&1; then
  printf 'Vercel needs you to sign in once in this terminal.\n'
  "${VC[@]}" login
fi

say "Pulling canonical production settings"
"${VC[@]}" pull --yes --environment=production

say "Installing exact dependencies"
npm ci

say "Building the Vercel production output locally"
rm -rf .next .vercel/output
"${VC[@]}" build --prod

say "Deploying the prebuilt output to production"
DEPLOYMENT_URL="$("${VC[@]}" deploy --prebuilt --prod --archive=tgz --yes)"

printf '\n'
printf '==============================================\n'
printf 'LOADLINK V2.7.13 DEPLOYED SUCCESSFULLY\n'
printf 'Deployment: %s\n' "$DEPLOYMENT_URL"
printf 'Main site:   https://matikinca-marketplace.vercel.app\n'
printf 'Git commit:  %s\n' "$(git rev-parse --short HEAD)"
printf '==============================================\n'
