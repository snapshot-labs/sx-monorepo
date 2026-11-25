#!/bin/sh
# Netlify's ignore command for every site built from this repo (see
# netlify.toml). Exit 0 skips the build: nothing the site is built from
# changed since its last build. Any other exit, a git error included, builds.
case "$SITE_NAME" in
snapshot-livenet | snapshot-testnet)
  set -- apps/ui packages
  ;;
snapshot-storybook)
  set -- packages/tune
  ;;
snapshot-landing)
  # The legal pages are built from the UI's Terms and Policy views.
  set -- apps/landing packages/tune apps/ui/src/views/Terms.vue \
    apps/ui/src/views/Policy.vue
  ;;
snapshot-docs)
  set -- docs
  ;;
*)
  exit 1
  ;;
esac
# The apps and packages are installed and built at the root.
[ "$SITE_NAME" = snapshot-docs ] || set -- "$@" package.json bun.lock turbo.json

# A first build, or one without cache, has no earlier build to compare with.
if [ -z "$CACHED_COMMIT_REF" ] || [ "$CACHED_COMMIT_REF" = "$COMMIT_REF" ]; then
  exit 1
fi
cd "$(git rev-parse --show-toplevel)" || exit 1
git diff --quiet "$CACHED_COMMIT_REF" "$COMMIT_REF" -- "$@"
