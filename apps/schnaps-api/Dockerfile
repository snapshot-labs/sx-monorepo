# syntax=docker/dockerfile:1

FROM oven/bun:1.4.0-alpine AS base
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.json ./
COPY apps/api/package.json apps/api/
COPY apps/delegates-api/package.json apps/delegates-api/
COPY apps/hub/package.json apps/hub/
COPY apps/mana/package.json apps/mana/
COPY apps/mcp/package.json apps/mcp/
COPY apps/schnaps-api/package.json apps/schnaps-api/
COPY apps/sequencer/package.json apps/sequencer/
COPY apps/ui/package.json apps/ui/
COPY contracts/schnaps/package.json contracts/schnaps/
COPY contracts/sx-evm/package.json contracts/sx-evm/
COPY contracts/sx-starknet/package.json contracts/sx-starknet/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/eslint-config-vue/package.json packages/eslint-config-vue/
COPY packages/lock/package.json packages/lock/
COPY packages/prettier-config/package.json packages/prettier-config/
COPY packages/sx.js/package.json packages/sx.js/
COPY packages/tune/package.json packages/tune/

# Build
FROM base AS build
RUN bun install --frozen-lockfile --ignore-scripts --filter=schnaps-api

# schnaps-api has no workspace dependencies, so install only its own packages
# and build it directly instead of through turbo (whose build task pulls in
# unrelated api codegen).
COPY apps/schnaps-api apps/schnaps-api
RUN cd apps/schnaps-api && bun run codegen && bun run build

# Production dependencies
FROM base AS prod-deps
RUN bun install --frozen-lockfile --production --ignore-scripts --filter=schnaps-api

# Runtime
FROM node:24-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app/apps/schnaps-api

COPY --from=prod-deps /app /app

# All of src/, not only schema.gql: the indexing hash in src/index.ts is
# computed from the source files at boot.
COPY --from=build /app/apps/schnaps-api/src ./src
COPY --from=build /app/apps/schnaps-api/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/src/index.js"]
