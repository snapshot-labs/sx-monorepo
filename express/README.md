# Futarchy Local Server

Local Express server that replaces external Futarchy APIs using Algebra pools data.

## Endpoints

| Local Endpoint | Replaces |
|----------------|----------|
| `http://localhost:3030/api/v1/market-events/proposals/:id/prices` | `stag.api.tickspread.com` |
| `http://localhost:3030/subgraphs/name/algebra-proposal-candles-v1` | Algebra candles subgraph |

## Quick Start

```bash
cd express-server
npm install
npm start
```

## Usage in Frontend

Update `apps/ui/.env` or environment variables:

```env
VITE_FUTARCHY_API_URL=http://localhost:3030
```

And in `useFutarchy.ts`, change the candles URL:

```typescript
const CANDLES_API_URL = 'http://localhost:3030/subgraphs/name/algebra-proposal-candles-v1';
```

## How It Works

1. **Market Events Endpoint** (`/api/v1/market-events/proposals/:id/prices`)
   - Fetches pool data from Algebra subgraph
   - Finds YES/NO conditional pools
   - Builds response matching Futarchy API format

2. **GraphQL Proxy** (`/subgraphs/name/algebra-proposal-candles-v1`)
   - Proxies requests to the real Algebra candles subgraph
   - Pass-through for candle queries

## File Structure

```
express-server/
├── package.json
├── README.md
└── src/
    ├── index.js              # Main server entry
    ├── routes/
    │   ├── market-events.js  # Futarchy API replacement
    │   └── graphql-proxy.js  # Algebra subgraph proxy
    └── services/
        └── algebra-client.js # Subgraph data fetching
```
