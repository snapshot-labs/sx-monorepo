# Shared image for the Snapshot hub and sequencer (permanent private voting fork).
#
# The hub and sequencer live in the same bun monorepo and share the same
# dependency closure, so a single image is built once and run with two
# different commands from docker-compose. Bun executes the TypeScript entry
# points directly, so no separate tsc build step is needed for the apps.
#
# Build context is the monorepo root (sx-monorepo/).
FROM oven/bun:1.3.14

WORKDIR /app

# Copy the whole monorepo. Bun workspaces resolve every apps/* and packages/*
# package.json during install, so a partial copy is not reliable. node_modules
# and build artefacts are excluded via .dockerignore.
COPY . .

# Install all workspace dependencies.
RUN bun install --frozen-lockfile

# The sequencer imports @snapshot-labs/private-vote-sdk, whose package "exports"
# point at dist/. Build just that one package (tsup + wasm copy) so the import
# resolves at runtime. The hub has no workspace dependencies.
RUN cd packages/private-vote-sdk && bun run build

ENV NODE_ENV=production

# hub: 3000, sequencer: 3001
EXPOSE 3000 3001

# Overridden per-service in docker-compose.yml.
CMD ["bun", "run", "apps/hub/src/index.ts"]
