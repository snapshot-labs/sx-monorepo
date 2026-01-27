/**
 * Test spot candles fetch
 */
import { fetchSpotCandles } from './src/services/spot-price.js';

async function test() {
    console.log('Testing spot candles fetch...\n');
    const result = await fetchSpotCandles(5);

    console.log('Result:');
    console.log('- Pool:', result.pool);
    console.log('- Price:', result.price);
    console.log('- Rate:', result.rate);
    console.log('- Candles count:', result.candles?.length);
    console.log('- First candle:', result.candles?.[0]);
    console.log('- Last candle:', result.candles?.[result.candles?.length - 1]);
}

test().catch(console.error);
