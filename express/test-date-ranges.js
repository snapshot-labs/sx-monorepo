/**
 * Test date range filtering on the GraphQL proxy
 */
const PROXY_URL = 'http://localhost:3030/subgraphs/name/algebra-proposal-candles-v1';
const YES_POOL = '0xf8346e622557763a62cc981187d084695ee296c3';
const NO_POOL = '0x76f78ec457c1b14bcf972f16eae44c7aa21d578f';

const query = `
  query GetCandles($yesPoolId: String!, $noPoolId: String!, $minTimestamp: Int!, $maxTimestamp: Int!) {
    yesCandles: candles(
      first: 1000
      orderBy: periodStartUnix
      orderDirection: asc
      where: { pool: $yesPoolId, periodStartUnix_gte: $minTimestamp, periodStartUnix_lte: $maxTimestamp, period: "3600" }
    ) {
      periodStartUnix
      close
    }
    noCandles: candles(
      first: 1000
      orderBy: periodStartUnix
      orderDirection: asc
      where: { pool: $noPoolId, periodStartUnix_gte: $minTimestamp, periodStartUnix_lte: $maxTimestamp, period: "3600" }
    ) {
      periodStartUnix
      close
    }
  }
`;

async function testDateRange(name, startDate, endDate) {
    const minTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const maxTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    console.log(`\n=== ${name} ===`);
    console.log(`Range: ${startDate} to ${endDate}`);
    console.log(`Timestamps: ${minTimestamp} to ${maxTimestamp}`);

    const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query,
            variables: {
                yesPoolId: YES_POOL,
                noPoolId: NO_POOL,
                minTimestamp,
                maxTimestamp
            }
        })
    });

    const data = await response.json();

    console.log(`YES candles: ${data.data?.yesCandles?.length || 0}`);
    console.log(`NO candles: ${data.data?.noCandles?.length || 0}`);
    console.log(`SPOT candles: ${data.data?.spotCandles?.length || 0}`);

    // Show first and last candle for each
    if (data.data?.yesCandles?.length > 0) {
        const first = data.data.yesCandles[0];
        const last = data.data.yesCandles[data.data.yesCandles.length - 1];
        console.log(`  YES first: ${new Date(parseInt(first.periodStartUnix) * 1000).toISOString()}`);
        console.log(`  YES last:  ${new Date(parseInt(last.periodStartUnix) * 1000).toISOString()}`);
    }

    if (data.data?.spotCandles?.length > 0) {
        const first = data.data.spotCandles[0];
        const last = data.data.spotCandles[data.data.spotCandles.length - 1];
        console.log(`  SPOT first: ${new Date(parseInt(first.periodStartUnix) * 1000).toISOString()}`);
        console.log(`  SPOT last:  ${new Date(parseInt(last.periodStartUnix) * 1000).toISOString()}`);
    }
}

async function main() {
    // Test 1: Jan 23-24, 2026
    await testDateRange('Jan 23-24, 2026', '2026-01-23T00:00:00Z', '2026-01-24T23:59:59Z');

    // Test 2: Jan 19-21, 2026
    await testDateRange('Jan 19-21, 2026', '2026-01-19T00:00:00Z', '2026-01-21T23:59:59Z');

    // Test 3: Full range (Jan 9 - Jan 27)
    await testDateRange('Full Range', '2026-01-09T00:00:00Z', '2026-01-27T23:59:59Z');
}

main().catch(console.error);
