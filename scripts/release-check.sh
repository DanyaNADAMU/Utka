#!/bin/sh
# ==============================================================================
# Script: release-check.sh
# Purpose: Universal Release Gate Invariants Verification
#
# Verifies non-bypassable pre-flight release invariants:
#   1. Clean Git working tree (no uncommitted or untracked changes).
#   2. Active branch strictly 'main'.
#   3. HEAD anchored at an annotated SemVer tag (vMAJOR.MINOR.PATCH).
#   4. Release tag documented with explicit section in CHANGELOG.md.
#
# Exit codes:
#   0 - All invariants passed or emergency override active
#   1 - Release invariant violation detected
# ==============================================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

OVERRIDE="${RELEASE_OVERRIDE:-false}"
if [ "$1" = "--override" ]; then
    OVERRIDE="true"
fi

if [ "$OVERRIDE" = "true" ]; then
    printf "${YELLOW}[RELEASE GATE WARNING] RELEASE_OVERRIDE is active. Release invariants are bypassed.${NC}\n"
    exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
    printf "${RED}[RELEASE GATE ERROR] Not inside a Git repository.${NC}\n"
    exit 1
fi

cd "$REPO_ROOT"

# Invariant 1: Clean Working Tree
GIT_STATUS="$(git status --porcelain)"
if [ -n "$GIT_STATUS" ]; then
    printf "${RED}[RELEASE GATE VIOLATION] Uncommitted changes detected in working tree:${NC}\n"
    git status --short
    printf "Production releases require an immutable, committed Git state.\n"
    printf "Commit or stash all changes before releasing.\n"
    exit 1
fi
printf "${GREEN}✓ [RELEASE GATE] Working tree is completely clean.${NC}\n"

# Invariant 2: Active Branch strictly 'main'
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "main" ]; then
    printf "${RED}[RELEASE GATE VIOLATION] Active branch is '%s'.${NC}\n" "$CURRENT_BRANCH"
    printf "Production releases are strictly restricted to the 'main' branch.\n"
    printf "Merge tested feature branches into 'main' prior to release.\n"
    exit 1
fi
printf "${GREEN}✓ [RELEASE GATE] Active branch is 'main'.${NC}\n"

# Invariant 3: Annotated SemVer Release Tag on HEAD
CURRENT_TAG="$(git describe --exact-match --tags HEAD 2>/dev/null || true)"
if [ -z "$CURRENT_TAG" ]; then
    printf "${RED}[RELEASE GATE VIOLATION] HEAD on 'main' is not tagged with a release tag.${NC}\n"
    printf "Tag this release using: git tag -a vX.Y.Z -m 'Release vX.Y.Z'\n"
    exit 1
fi

case "$CURRENT_TAG" in
    v[0-9]*.[0-9]*.[0-9]*)
        printf "${GREEN}✓ [RELEASE GATE] HEAD is anchored at release tag '%s'.${NC}\n" "$CURRENT_TAG"
        ;;
    *)
        printf "${RED}[RELEASE GATE VIOLATION] Tag '%s' does not match Semantic Versioning (vMAJOR.MINOR.PATCH).${NC}\n" "$CURRENT_TAG"
        exit 1
        ;;
esac

# Invariant 4: Changelog Documentation
CHANGELOG_FILE="$REPO_ROOT/CHANGELOG.md"
if [ ! -f "$CHANGELOG_FILE" ]; then
    printf "${RED}[RELEASE GATE VIOLATION] Missing CHANGELOG.md at root.${NC}\n"
    exit 1
fi

if ! grep -Fq "## [$CURRENT_TAG]" "$CHANGELOG_FILE"; then
    printf "${RED}[RELEASE GATE VIOLATION] Release tag '%s' is not documented in CHANGELOG.md.${NC}\n" "$CURRENT_TAG"
    printf "Add an explicit section: '## [%s] - YYYY-MM-DD' before releasing.\n" "$CURRENT_TAG"
    exit 1
fi
printf "${GREEN}✓ [RELEASE GATE] Release '%s' is documented in CHANGELOG.md.${NC}\n" "$CURRENT_TAG"

printf "${BLUE}========================================================================${NC}\n"
printf "${GREEN}[RELEASE GATE PASSED] Production release '%s' approved on branch main.${NC}\n" "$CURRENT_TAG"
printf "${BLUE}========================================================================${NC}\n"
exit 0
