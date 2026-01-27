/**
 * sDAI Rate Provider Service
 * Uses Gnosis RPC to get sDAI → USD conversion rate
 * 
 * Contract: 0x89C80A4540A00b5270347E02e2E144c71da2EceD
 * Function: getRate() returns (uint256)
 */

const GNOSIS_RPC = 'https://rpc.gnosis.gateway.fm';
const RATE_PROVIDER_ADDRESS = '0x89C80A4540A00b5270347E02e2E144c71da2EceD';

// getRate() function selector
const GET_RATE_SELECTOR = '0x679aefce';

/**
 * Get the sDAI to USD rate from the rate provider contract
 * Returns a number representing the rate (e.g., 1.05 means 1 sDAI = $1.05)
 */
export async function getSdaiRate() {
    try {
        const response = await fetch(GNOSIS_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_call',
                params: [
                    {
                        to: RATE_PROVIDER_ADDRESS,
                        data: GET_RATE_SELECTOR
                    },
                    'latest'
                ]
            })
        });

        const { result, error } = await response.json();

        if (error) {
            console.error('RPC Error:', error);
            return 1; // Fallback to 1:1
        }

        // Parse the uint256 result (18 decimals)
        const rateBigInt = BigInt(result);
        const rate = Number(rateBigInt) / 1e18;

        console.log(`   💰 sDAI Rate: ${rate.toFixed(6)} USD`);
        return rate;

    } catch (error) {
        console.error('Error fetching sDAI rate:', error.message);
        return 1; // Fallback to 1:1
    }
}

// Cache the rate for 5 minutes
let cachedRate = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getSdaiRateCached() {
    const now = Date.now();

    if (cachedRate !== null && (now - cacheTime) < CACHE_DURATION) {
        return cachedRate;
    }

    cachedRate = await getSdaiRate();
    cacheTime = now;
    return cachedRate;
}
