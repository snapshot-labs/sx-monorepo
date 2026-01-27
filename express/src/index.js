/**
 * Local Express Server for Futarchy Development
 * 
 * Replaces:
 * - stag.api.tickspread.com → localhost:3030/api/v1/...
 * - Algebra candles subgraph → localhost:3030/subgraphs/name/algebra-proposal-candles-v1
 * 
 * Run: npm start (or npm run dev for watch mode)
 */

import express from 'express';
import cors from 'cors';
import { handleMarketEventsRequest } from './routes/market-events.js';
import { handleGraphQLRequest } from './routes/graphql-proxy.js';

const app = express();
const PORT = 3030;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// FUTARCHY API REPLACEMENT
// Route: /api/v1/market-events/proposals/:proposalId/prices
// Replaces: stag.api.tickspread.com
// ============================================
app.get('/api/v1/market-events/proposals/:proposalId/prices', handleMarketEventsRequest);

// ============================================
// ALGEBRA CANDLES GRAPHQL PROXY
// Route: /subgraphs/name/algebra-proposal-candles-v1
// Proxies: d3ugkaojqkfud0.cloudfront.net/subgraphs/name/algebra-proposal-candles-v1
// ============================================
app.post('/subgraphs/name/algebra-proposal-candles-v1', handleGraphQLRequest);

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 Futarchy Local Server Running');
    console.log('─'.repeat(50));
    console.log(`   Port: ${PORT}`);
    console.log('');
    console.log('📍 Endpoints:');
    console.log(`   GET  http://localhost:${PORT}/api/v1/market-events/proposals/:id/prices`);
    console.log(`   POST http://localhost:${PORT}/subgraphs/name/algebra-proposal-candles-v1`);
    console.log('');
    console.log('🔧 To use in frontend, change URLs to:');
    console.log(`   VITE_FUTARCHY_API_URL=http://localhost:${PORT}`);
    console.log(`   Candles: http://localhost:${PORT}/subgraphs/name/algebra-proposal-candles-v1`);
    console.log('─'.repeat(50));
});
