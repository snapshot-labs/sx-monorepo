#!/bin/sh
# Netlify's ignore command for every site built from this repo (see
# netlify.toml). Exit 0 skips a deploy preview whose pull request changes
# nothing the site is built from. Anything else builds, a failure included.
# Production always builds: Netlify's last built commit can be the merged pull
# request's own, which would make the merge look unchanged.
[ "$CONTEXT" = deploy-preview ] || exit 1
case "$SITE_NAME" in
snapshot-livenet | snapshot-testnet) set -- apps/ui packages ;;
snapshot-storybook) set -- packages/tune ;;
snapshot-landing) set -- apps/landing packages/tune ;;
snapshot-docs) set -- docs ;;
*) exit 1 ;;
esac
# The apps and packages are installed and built from the root.
[ "$SITE_NAME" = snapshot-docs ] ||
  set -- "$@" package.json bun.lock tsconfig.json turbo.json

# The pull request's changes since it branched off master. A fetch that stalls
# gives up after a minute.
cd "$(git rev-parse --show-toplevel)" &&
  git -c http.lowSpeedLimit=1 -c http.lowSpeedTime=60 fetch -q origin master &&
  base=$(git merge-base FETCH_HEAD "$COMMIT_REF") || exit 1
git diff --quiet "$base" "$COMMIT_REF" -- "$@"
