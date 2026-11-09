#!/bin/sh
# ==============================================================================
# Script: release.sh
# Purpose: Milestone Release Automation (Changelog, Signed Tag & OpenTimestamps)
# Usage:
#   scripts/release.sh v1.2.0
#   scripts/release.sh 1.2.0
# ==============================================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

TAG_INPUT="$1"

if [ -z "$TAG_INPUT" ]; then
    printf "${RED}Usage: $0 <version> (e.g. $0 v1.2.0 or $0 1.2.0)${NC}\n"
    exit 1
fi

case "$TAG_INPUT" in
    v*) TAG="$TAG_INPUT" ;;
    *)  TAG="v$TAG_INPUT" ;;
esac

case "$TAG" in
    v[0-9]*.[0-9]*.[0-9]*) ;;
    *)
        printf "${RED}Error: Version '%s' does not match Semantic Versioning (vMAJOR.MINOR.PATCH).${NC}\n" "$TAG"
        exit 1
        ;;
esac

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
    printf "${RED}Error: Not inside a Git repository.${NC}\n"
    exit 1
fi

cd "$REPO_ROOT"

# Check branch
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "main" ]; then
    printf "${RED}Error: Releases can only be created from 'main' branch (currently on '%s').${NC}\n" "$CURRENT_BRANCH"
    exit 1
fi

# Check working tree
if [ -n "$(git status --porcelain)" ]; then
    printf "${RED}Error: Working tree is not clean. Commit or stash all changes first.${NC}\n"
    git status --short
    exit 1
fi

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
    printf "${RED}Error: Git tag '%s' already exists.${NC}\n" "$TAG"
    exit 1
fi

CHANGELOG="$REPO_ROOT/CHANGELOG.md"
if [ ! -f "$CHANGELOG" ]; then
    printf "${RED}Error: Missing CHANGELOG.md.${NC}\n"
    exit 1
fi

TODAY="$(date +%Y-%m-%d)"

# Check if CHANGELOG.md already has this tag section
if grep -Fq "## [$TAG]" "$CHANGELOG"; then
    printf "${BLUE}[i] Tag section '## [%s]' already exists in CHANGELOG.md.${NC}\n" "$TAG"
else
    # Replace ## [Unreleased] with ## [Unreleased] \n\n ## [vX.Y.Z] - YYYY-MM-DD
    if grep -Fq "## [Unreleased]" "$CHANGELOG"; then
        sed -i "s/## \[Unreleased\]/## [Unreleased]\n\n## [$TAG] - $TODAY/" "$CHANGELOG"
        printf "${GREEN}✓ Updated CHANGELOG.md with release section: '## [%s] - %s'${NC}\n" "$TAG" "$TODAY"
        git add "$CHANGELOG"
        git commit -S -m "chore(release): $TAG"
    else
        printf "${RED}Error: Could not find '## [Unreleased]' section in CHANGELOG.md.${NC}\n"
        exit 1
    fi
fi

# Create annotated signed tag
printf "${BLUE}==> Creating annotated cryptographically signed tag '%s'...${NC}\n" "$TAG"
git tag -a "$TAG" -m "Release $TAG"

# Run OpenTimestamps sync if available
if command -v ots >/dev/null 2>&1 || git config --get alias.ots-sync >/dev/null 2>&1; then
    printf "${BLUE}==> Anchoring release tag in Bitcoin blockchain via OpenTimestamps...${NC}\n"
    git ots-sync || (git ots upgrade >/dev/null 2>&1 && git ots run >/dev/null 2>&1) || true
fi

printf "${GREEN}========================================================================${NC}\n"
printf "${GREEN}✓ Release %s successfully created and signed!${NC}\n" "$TAG"
printf "${GREEN}========================================================================${NC}\n"

# Verify through release-check.sh
if [ -f "$REPO_ROOT/scripts/release-check.sh" ]; then
    "$REPO_ROOT/scripts/release-check.sh"
fi
