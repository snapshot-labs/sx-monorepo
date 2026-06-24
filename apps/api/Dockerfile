# syntax=docker/dockerfile:1

FROM oven/bun:1.3.9-alpine AS base
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.json ./
COPY apps/api/package.json apps/api/
COPY apps/auction/package.json apps/auction/
COPY apps/highlight/package.json apps/highlight/
COPY apps/hub/package.json apps/hub/
COPY apps/mana/package.json apps/mana/
COPY apps/mcp/package.json apps/mcp/
COPY apps/sequencer/package.json apps/sequencer/
COPY apps/ui/package.json apps/ui/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/eslint-config-vue/package.json packages/eslint-config-vue/
COPY packages/lock/package.json packages/lock/
COPY packages/prettier-config/package.json packages/prettier-config/
COPY packages/sx.js/package.json packages/sx.js/
COPY packages/tune/package.json packages/tune/

# Build
FROM base AS build
RUN bun install --frozen-lockfile --ignore-scripts

COPY apps/api apps/api
# turbo's build task depends on highlight#codegen, so its source is needed too
COPY apps/highlight apps/highlight
COPY packages packages
RUN bun run build --filter=api

# Production dependencies
FROM base AS prod-deps
RUN bun install --frozen-lockfile --production --ignore-scripts --filter=api

# Runtime
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app/apps/api

COPY --from=prod-deps /app /app

COPY --from=build /app/packages/sx.js/dist /app/packages/sx.js/dist
COPY --from=build /app/packages/sx.js/dist.cjs /app/packages/sx.js/dist.cjs
COPY --from=build /app/apps/api/src/schema.gql ./src/schema.gql
COPY --from=build /app/apps/api/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/src/index.js"]
