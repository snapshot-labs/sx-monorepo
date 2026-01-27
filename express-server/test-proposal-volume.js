/**
 * Test script to inspect proposal 0x45e1064348fD8A407D6D1F59Fc64B05F633b28FC
 * Shows pool data, token roles, and volume calculations
 */

const ALGEBRA_ENDPOINT = 'https://d3ugkaojqkfud0.cloudfront.net/subgraphs/name/algebra-proposal-candles-v1';
const PROPOSAL_ID = '0x45e1064348fd8a407d6d1f59fc64b05f633b28fc';

async function fetchPoolsForProposal(proposalId) {
    const query = `
    query GetProposalPools($proposalId: String!) {
      pools(where: { proposal: $proposalId }) {
        id
        name
        type
        outcomeSide
        price
        isInverted
        volumeToken0
        volumeToken1
        token0 {
          id
          symbol
          role
        }
        token1 {
          id
          symbol
          role
        }
        proposal {
          id
          marketName
          companyToken { id symbol }
          currencyToken { id symbol }
        }
      }
    }
  `;

    const response = await fetch(ALGEBRA_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { proposalId } })
    });

    const { data, errors } = await response.json();
    if (errors) throw new Error(errors[0].message);
    return data.pools || [];
}

async function main() {
    console.log(`\n🔍 Fetching pools for proposal: ${PROPOSAL_ID}\n`);
    console.log('='.repeat(80));

    const pools = await fetchPoolsForProposal(PROPOSAL_ID);
    console.log(`Found ${pools.length} pools\n`);

    // Group by type
    const conditionalYes = pools.find(p => p.outcomeSide === 'YES' && p.type === 'CONDITIONAL');
    const conditionalNo = pools.find(p => p.outcomeSide === 'NO' && p.type === 'CONDITIONAL');

    // Show proposal info
    const proposal = pools[0]?.proposal;
    if (proposal) {
        console.log('📋 PROPOSAL INFO');
        console.log('-'.repeat(40));
        console.log(`   Market Name: ${proposal.marketName}`);
        console.log(`   Company Token: ${proposal.companyToken?.symbol}`);
        console.log(`   Currency Token: ${proposal.currencyToken?.symbol}`);
        console.log();
    }

    // Analyze each conditional pool
    for (const pool of [conditionalYes, conditionalNo]) {
        if (!pool) continue;

        console.log(`\n📊 ${pool.outcomeSide} CONDITIONAL POOL`);
        console.log('-'.repeat(40));
        console.log(`   Pool ID: ${pool.id}`);
        console.log(`   Name: ${pool.name}`);
        console.log(`   Price: ${pool.price}`);
        console.log(`   Is Inverted: ${pool.isInverted}`);
        console.log();

        // Token analysis
        console.log('   TOKEN 0:');
        console.log(`      Symbol: ${pool.token0.symbol}`);
        console.log(`      Role: ${pool.token0.role}`);
        console.log(`      Volume: ${pool.volumeToken0}`);
        console.log();

        console.log('   TOKEN 1:');
        console.log(`      Symbol: ${pool.token1.symbol}`);
        console.log(`      Role: ${pool.token1.role}`);
        console.log(`      Volume: ${pool.volumeToken1}`);
        console.log();

        // Calculate correct volumes based on role
        const currencyToken = pool.token0.role === 'CURRENCY' ? 'token0'
            : pool.token1.role === 'CURRENCY' ? 'token1' : null;
        const companyToken = pool.token0.role === 'COLLATERAL' ? 'token0'
            : pool.token1.role === 'COLLATERAL' ? 'token1' : null;

        const currencyVolume = currencyToken === 'token0' ? pool.volumeToken0
            : currencyToken === 'token1' ? pool.volumeToken1 : '0';
        const companyVolume = companyToken === 'token0' ? pool.volumeToken0
            : companyToken === 'token1' ? pool.volumeToken1 : '0';

        console.log('   📈 VOLUME CALCULATION:');
        console.log(`      Currency Token: ${currencyToken} (${currencyToken === 'token0' ? pool.token0.symbol : pool.token1.symbol})`);
        console.log(`      Company Token: ${companyToken} (${companyToken === 'token0' ? pool.token0.symbol : pool.token1.symbol})`);
        console.log();
        console.log(`      Currency Volume (for USD): ${currencyVolume}`);
        console.log(`      Company Volume: ${companyVolume}`);

        // Assuming sDAI rate ~1.22
        const sdaiRate = 1.22;
        const volumeUsd = parseFloat(currencyVolume || '0') * sdaiRate;
        console.log(`      Volume USD (×${sdaiRate} sDAI rate): $${volumeUsd.toFixed(2)}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('Done!\n');
}

main().catch(console.error);
