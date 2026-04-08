#!/usr/bin/env sh

set -eu

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <base> <head>" >&2
  exit 2
fi

base=$1
head=$2

repo_root=$(cd "$(dirname "$0")/.." && pwd)
checker="$repo_root/scripts/check-commit-standards.sh"

is_all_zero_oid() {
  oid=$1
  [ -n "$oid" ] && printf '%s' "$oid" | grep -Eq '^0+$'
}

commit_has_enforcement_marker() {
  commit=$1
  git -C "$repo_root" cat-file -e "$commit:git-hooks/commit-msg" 2>/dev/null &&
    git -C "$repo_root" cat-file -e "$commit:scripts/check-commit-standards.sh" 2>/dev/null
}

if is_all_zero_oid "$base"; then
  commits=$(git -C "$repo_root" rev-list -n 1 "$head")
else
  commits=$(git -C "$repo_root" rev-list "$base..$head")
fi

if [ -z "$commits" ]; then
  echo "No commits to check in range $base..$head"
  exit 0
fi

for commit in $commits; do
  if ! commit_has_enforcement_marker "$commit"; then
    echo "Skipping pre-adoption commit $commit"
    continue
  fi

  tmp=$(mktemp)
  git -C "$repo_root" log -1 --format=%B "$commit" > "$tmp"
  if ! "$checker" "$tmp"; then
    echo >&2
    echo "Offending commit: $commit" >&2
    rm -f "$tmp"
    exit 1
  fi
  rm -f "$tmp"
done

echo "Commit standards passed for range $base..$head"
