#!/usr/bin/env sh

set -eu

repo_root=$(cd "$(dirname "$0")/.." && pwd)
git -C "$repo_root" config core.hooksPath git-hooks
chmod +x \
  "$repo_root/git-hooks/pre-commit" \
  "$repo_root/git-hooks/commit-msg" \
  "$repo_root/scripts/check-commit-standards.sh" \
  "$repo_root/scripts/check-commit-range.sh" \
  "$repo_root/scripts/install-hooks.sh"

echo "Configured git hooks for $repo_root"
echo "Active hooks path: git-hooks"
