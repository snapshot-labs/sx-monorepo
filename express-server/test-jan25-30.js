/**
 * Check actual candle data for Jan 25-30 range
 */
const ALGEBRA_ENDPOINT = 'https://d3ugkaojqkfud0.cloudfront.net/subgraphs/name/algebra-proposal-candles-v1';
const YES_POOL = '0xf8346e622557763a62cc981187d084695ee296c3';
const NO_POOL = '0x76f78ec457c1b14bcf972f16eae44c7aa21d578f';

// Jan 25-30 timestamps
const jan25 = Math.floor(new Date('2026-01-25T00:00:00Z').getTime() / 1000);
const jan30 = Math.floor(new Date('2026-01-30T00:00:00Z').getTime() / 1000);

async function fetchCandles(poolId, name) {
    const query = `query {
    candles(
      first: 500
      orderBy: periodStartUnix
      orderDirection: asc
      where: { 
        pool: "${poolId}", 
        period: "3600",
        periodStartUnix_gte: ${jan25},
        periodStartUnix_lte: ${jan30}
      }
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

    const data = await res.json();
    return data.data.candles || [];
}

async function main() {
    console.log(`Checking ACTUAL candles for Jan 25-30, 2026`);
    console.log(`Range: ${new Date(jan25 * 1000).toISOString()} to ${new Date(jan30 * 1000).toISOString()}\n`);

    const [yesCandles, noCandles] = await Promise.all([
        fetchCandles(YES_POOL, 'YES'),
        fetchCandles(NO_POOL, 'NO')
    ]);

    console.log(`=== YES Pool: ${yesCandles.length} ACTUAL candles ===`);
    yesCandles.forEach((c, i) => {
        const date = new Date(parseInt(c.periodStartUnix) * 1000);
        console.log(`${i + 1}. ${date.toISOString().slice(0, 16)} | $${parseFloat(c.close).toFixed(2)}`);
    });

    console.log(`\n=== NO Pool: ${noCandles.length} ACTUAL candles ===`);
    noCandles.forEach((c, i) => {
        const date = new Date(parseInt(c.periodStartUnix) * 1000);
        console.log(`${i + 1}. ${date.toISOString().slice(0, 16)} | $${parseFloat(c.close).toFixed(2)}`);
    });

    // Count expected hours vs actual
    const expectedHours = (jan30 - jan25) / 3600;
    console.log(`\n=== SUMMARY ===`);
    console.log(`Expected hours: ${expectedHours}`);
    console.log(`YES actual candles: ${yesCandles.length} (${(yesCandles.length / expectedHours * 100).toFixed(1)}% density)`);
    console.log(`NO actual candles: ${noCandles.length} (${(noCandles.length / expectedHours * 100).toFixed(1)}% density)`);
}

main().catch(console.error);
