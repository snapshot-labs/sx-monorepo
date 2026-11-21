# syntax=docker/dockerfile:1

FROM oven/bun:1.4.0-alpine AS base
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.json ./
COPY apps/api/package.json apps/api/
COPY apps/delegates-api/package.json apps/delegates-api/
COPY apps/hub/package.json apps/hub/
COPY apps/mana/package.json apps/mana/
COPY apps/mcp/package.json apps/mcp/
COPY apps/sequencer/package.json apps/sequencer/
COPY apps/ui/package.json apps/ui/
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
RUN bun install --frozen-lockfile --ignore-scripts

COPY packages/sx.js packages/sx.js
COPY apps/mana apps/mana
RUN cd packages/sx.js && bun run build && cd ../../apps/mana && bun run build

# Production dependencies
FROM base AS prod-deps
RUN bun install --frozen-lockfile --production --ignore-scripts --filter=mana

# Runtime
FROM node:24.22.1-alpine AS runtime

# Bun runs the knex migrations (prestart), the server itself runs on Node
COPY --from=oven/bun:1.4.0-alpine /usr/local/bin/bun /usr/local/bin/bun

ENV NODE_ENV=production
WORKDIR /app/apps/mana

COPY --from=prod-deps /app /app

COPY --from=build /app/packages/sx.js/dist /app/packages/sx.js/dist
COPY --from=build /app/packages/sx.js/dist.cjs /app/packages/sx.js/dist.cjs
COPY --from=build /app/apps/mana/dist ./dist
COPY apps/mana/knexfile.ts ./
COPY apps/mana/migrations ./migrations

USER node
EXPOSE 8080
CMD ["bun", "run", "start"]
