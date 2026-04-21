#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-basic}" # basic | full

echo "== Git State =="
git rev-parse --abbrev-ref HEAD
git status --short

echo
echo "== Runtime =="
node -v || true
npm -v || true

echo
echo "== Environment Files =="
if [[ -f ".env.local" ]]; then
  echo ".env.local present"
else
  echo "WARNING: .env.local missing"
fi

if [[ -f ".env.example" ]]; then
  echo ".env.example present"
else
  echo "WARNING: .env.example missing"
fi

echo
echo "== Required Key Presence (.env.local names only) =="
if [[ -f ".env.local" ]]; then
  for key in NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY CLERK_SECRET_KEY; do
    if grep -Eq "^${key}[[:space:]]*=[[:space:]]*\S+" .env.local; then
      echo "OK: ${key}"
    else
      echo "MISSING: ${key}"
    fi
  done
else
  echo "Skipping key-name check because .env.local is missing"
fi

if [[ "$MODE" == "full" ]]; then
  echo
  echo "== Full Checks =="
  if [[ -d "node_modules" ]]; then
    npm run typecheck
    npm run lint
    npm test
    npm run build
  else
    echo "node_modules missing; skipping typecheck/lint"
  fi
fi

echo
echo "Done."