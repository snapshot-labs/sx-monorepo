/**
 * Spot Price Service
 * Fetches spot price from GeckoTerminal and applies sDAI rate conversion
 * 
 * Hardcoded config:
 * Pool: 0x8189c4c96826d016a99986394103dfa9ae41e7ee (PNK/sDAI on Gnosis)
 * Rate Provider: 0x89c80a4540a00b5270347e02e2e144c71da2eced (sDAI → USD)
 */

const GECKO_API = 'https://api.geckoterminal.com/api/v2';
const GNOSIS_RPC = 'https://rpc.gnosis.gateway.fm';

// Hardcoded spot config
const SPOT_POOL = '0x8189c4c96826d016a99986394103dfa9ae41e7ee';
const RATE_PROVIDER = '0x89c80a4540a00b5270347e02e2e144c71da2eced';
const NETWORK = 'xdai';

// getRate() selector
const GET_RATE_SELECTOR = '0x679aefce';

/**
 * Get sDAI rate from rate provider
 */
async function getSdaiRate() {
    try {
        const response = await fetch(GNOSIS_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_call',
                params: [{ to: RATE_PROVIDER, data: GET_RATE_SELECTOR }, 'latest']
            })
        });
        const { result } = await response.json();
        return Number(BigInt(result)) / 1e18;
    } catch (e) {
        console.error('[spotPrice] Rate fetch failed:', e.message);
        return 1;
    }
}

/**
 * Fetch spot candles from GeckoTerminal
 */
export async function fetchSpotCandles(limit = 500) {
    try {
        console.log('[spotPrice] Fetching from GeckoTerminal...');

        // Fetch OHLCV (currency=token gives price in sDAI, not USD)
        const url = `${GECKO_API}/networks/${NETWORK}/pools/${SPOT_POOL}/ohlcv/hour?aggregate=1&limit=${limit}&currency=token`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`GeckoTerminal failed: ${res.status}`);
        }

        const data = await res.json();
        const ohlcv = data.data?.attributes?.ohlcv_list || [];

        // Get sDAI rate for USD conversion
        const sdaiRate = await getSdaiRate();
        console.log(`[spotPrice] sDAI rate: ${sdaiRate.toFixed(4)}`);

        // Transform: [timestamp, open, high, low, close, volume]
        // Divide by rate because sDAI rate means 1 DAI = X sDAI shares
        const candles = ohlcv.map(c => ({
            time: c[0], // Already in seconds
            value: parseFloat(c[4]) / sdaiRate  // Close price in USD
        })).reverse().sort((a, b) => a.time - b.time);

        const latestPrice = candles.length > 0 ? candles[candles.length - 1].value : null;

        console.log(`[spotPrice] Fetched ${candles.length} candles, latest: $${latestPrice?.toFixed(4)}`);

        return {
            candles,
            price: latestPrice,
            rate: sdaiRate,
            pool: SPOT_POOL
        };

    } catch (e) {
        console.error('[spotPrice] Error:', e.message);
        return { candles: [], price: null, rate: null, pool: SPOT_POOL, error: e.message };
    }
}

/**
 * Get current spot price
 */
export async function getSpotPrice() {
    const result = await fetchSpotCandles(1);
    return result.price;
}
