/**
 * Compare timestamps from GeckoTerminal spot candles vs Algebra subgraph candles
 */
import { fetchSpotCandles } from './src/services/spot-price.js';

const ALGEBRA_ENDPOINT = 'https://d3ugkaojqkfud0.cloudfront.net/subgraphs/name/algebra-proposal-candles-v1';
const YES_POOL = '0xf8346e622557763a62cc981187d084695ee296c3';

async function fetchAlgebraCandles() {
    const query = `query {
    candles(
      first: 10
      orderBy: periodStartUnix
      orderDirection: desc
      where: { pool: "${YES_POOL}", period: "3600" }
    ) {
      periodStartUnix
      close
    }
  }`;

    const res = await fetch(ALGEBRA_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    });

    return (await res.json()).data.candles;
}

async function main() {
    console.log('Comparing timestamps between GeckoTerminal and Algebra...\n');

    // Fetch both
    const [spotData, algebraCandles] = await Promise.all([
        fetchSpotCandles(10),
        fetchAlgebraCandles()
    ]);

    console.log('=== GECKOTERMINAL SPOT (last 10) ===');
    spotData.candles.slice(-10).forEach((c, i) => {
        const date = new Date(c.time * 1000);
        console.log(`${i + 1}. timestamp: ${c.time} → ${date.toISOString()} | $${c.value.toFixed(2)}`);
    });

    console.log('\n=== ALGEBRA YES POOL (last 10) ===');
    algebraCandles.reverse().forEach((c, i) => {
        const ts = parseInt(c.periodStartUnix);
        const date = new Date(ts * 1000);
        console.log(`${i + 1}. timestamp: ${ts} → ${date.toISOString()} | $${parseFloat(c.close).toFixed(2)}`);
    });

    // Check if timestamps align to hours
    console.log('\n=== TIMESTAMP ALIGNMENT CHECK ===');
    const spotSample = spotData.candles[spotData.candles.length - 1];
    const algebraSample = algebraCandles[0];

    console.log('Spot last:', spotSample.time, '→', new Date(spotSample.time * 1000).toISOString());
    console.log('Algebra last:', algebraSample.periodStartUnix, '→', new Date(parseInt(algebraSample.periodStartUnix) * 1000).toISOString());

    // Check if both are on the hour (divisible by 3600)
    console.log('\nSpot on hour boundary:', spotSample.time % 3600 === 0);
    console.log('Algebra on hour boundary:', parseInt(algebraSample.periodStartUnix) % 3600 === 0);
}

main().catch(console.error);
