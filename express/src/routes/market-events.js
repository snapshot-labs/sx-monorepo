/**
 * Market Events Route
 * Replaces: stag.api.tickspread.com/api/v1/market-events/proposals/:proposalId/prices
 * 
 * Builds response from Algebra pools data + spot price from GeckoTerminal
 * Returns REAL pool IDs so the frontend can fetch candles
 */

import { fetchPoolsForProposal } from '../services/algebra-client.js';
import { getSdaiRateCached } from '../services/sdai-rate.js';
import { getSpotPrice } from '../services/spot-price.js';

// Mocked timeline: start = 2 days ago, end = 3 days from now
function getMockedTimeline() {
    const now = Date.now();
    const start = now - (2 * 24 * 60 * 60 * 1000); // 2 days ago
    const end = now + (3 * 24 * 60 * 60 * 1000);   // 3 days from now
    return {
        start: Math.floor(start / 1000),
        end: Math.floor(end / 1000)
    };
}

// Proposal ID mapping (frontend ID → subgraph ID)
const PROPOSAL_MAPPING = {
    '0x57853565aa27e14788f9533e9b788b20473b4e81711a16bef0b7210e3fa8a900': '0x45e1064348fd8a407d6d1f59fc64b05f633b28fc',
    '0x57853565aa007e14788f9533e9b788b20473b4e81711a16bef0b7210e3fa8a90': '0x45e1064348fd8a407d6d1f59fc64b05f633b28fc',
};

function resolveProposalId(proposalId) {
    const normalized = proposalId.toLowerCase();
    return PROPOSAL_MAPPING[normalized] || normalized;
}

export async function handleMarketEventsRequest(req, res) {
    const { proposalId } = req.params;
    const subgraphProposalId = resolveProposalId(proposalId);

    console.log(`📊 [Market Events] Request: ${proposalId.slice(0, 10)}... → ${subgraphProposalId.slice(0, 10)}...`);

    try {
        // Fetch sDAI rate for USD conversion
        const sdaiRate = await getSdaiRateCached();

        // Fetch spot price from GeckoTerminal
        const spotPrice = await getSpotPrice();
        console.log(`   💹 Spot price: $${spotPrice?.toFixed(4) || 'N/A'}`);

        // Fetch pools from Algebra subgraph using resolved ID
        const pools = await fetchPoolsForProposal(subgraphProposalId);
        console.log(`   📦 Found ${pools.length} pools`);

        // Find YES and NO conditional pools
        const yesPool = pools.find(p => p.outcomeSide === 'YES' && p.type === 'CONDITIONAL');
        const noPool = pools.find(p => p.outcomeSide === 'NO' && p.type === 'CONDITIONAL');

        // Get company token from proposal
        const proposal = pools[0]?.proposal;
        const companyToken = proposal?.companyToken;

        // Convert sDAI prices to USD
        const yesPrice = yesPool ? parseFloat(yesPool.price) * sdaiRate : 0;
        const noPrice = noPool ? parseFloat(noPool.price) * sdaiRate : 0;

        // Get timeline (mocked for now)
        const timeline = getMockedTimeline();

        // Build response with REAL pool IDs (essential for candles query)
        const response = {
            event_id: proposalId,
            conditional_yes: {
                price_usd: yesPrice,
                pool_id: yesPool?.id || ''  // Real pool ID from subgraph
            },
            conditional_no: {
                price_usd: noPrice,
                pool_id: noPool?.id || ''   // Real pool ID from subgraph
            },
            spot: {
                price_usd: spotPrice
            },
            company_tokens: {
                base: {
                    tokenSymbol: companyToken?.symbol || 'PNK'
                }
            },
            timeline: {
                start: timeline.start,
                end: timeline.end
            },
            volume: {
                conditional_yes: yesPool ? {
                    status: 'ok',
                    pool_id: yesPool.id,
                    volume: yesPool.volumeToken0 || '0',
                    volume_usd: String(parseFloat(yesPool.volumeToken1 || '0') * sdaiRate)
                } : undefined,
                conditional_no: noPool ? {
                    status: 'ok',
                    pool_id: noPool.id,
                    volume: noPool.volumeToken0 || '0',
                    volume_usd: String(parseFloat(noPool.volumeToken1 || '0') * sdaiRate)
                } : undefined
            }
        };

        if (yesPool && noPool) {
            console.log(`   ✅ YES: $${yesPrice.toFixed(4)} (${yesPool.id.slice(0, 10)}...), NO: $${noPrice.toFixed(4)} (${noPool.id.slice(0, 10)}...)`);
        } else {
            console.log(`   ⚠️ Missing pools - YES: ${!!yesPool}, NO: ${!!noPool}`);
        }

        res.json(response);

    } catch (error) {
        console.error('   ❌ Error:', error.message);
        res.status(500).json({ error: error.message });
    }
}
