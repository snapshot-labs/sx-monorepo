# Shared image for the Snapshot hub and sequencer (permanent private voting fork).
#
# The hub and sequencer live in the same bun monorepo and share the same
# dependency closure, so a single image is built once and run with two
# different commands from docker-compose. Bun executes the TypeScript entry
# points directly, so no separate tsc build step is needed for the apps.
#
# Build context is the monorepo root (sx-monorepo/).
# Keep in step with the monorepo's `packageManager` pin in package.json: the
# lockfile format moved with bun 1.4, and an older bun cannot do a frozen
# install against it.
FROM oven/bun:1.4.0

WORKDIR /app

# Copy the whole monorepo. Bun workspaces resolve every apps/* and packages/*
# package.json during install, so a partial copy is not reliable. node_modules
# and build artefacts are excluded via .dockerignore.
COPY . .

# Install all workspace dependencies.
RUN bun install --frozen-lockfile

ENV NODE_ENV=production

# hub: 3000, sequencer: 3001
EXPOSE 3000 3001

# Overridden per-service in docker-compose.yml.
CMD ["bun", "run", "apps/hub/src/index.ts"]
