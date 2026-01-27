/**
 * Algebra Subgraph Client
 * Fetches pool data from Algebra candles subgraph
 */

const ALGEBRA_ENDPOINT = 'https://d3ugkaojqkfud0.cloudfront.net/subgraphs/name/algebra-proposal-candles-v1';

/**
 * Fetch all pools for a proposal
 */
export async function fetchPoolsForProposal(proposalId) {
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
          companyToken {
            id
            symbol
          }
          currencyToken {
            id
            symbol
          }
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

    if (errors) {
        throw new Error(errors[0].message);
    }

    return data.pools || [];
}

/**
 * Get latest price from candles for a pool
 */
export async function getLatestPrice(poolId, maxTimestamp = null) {
    const whereClause = maxTimestamp
        ? `pool: "${poolId}", period: "3600", periodStartUnix_lte: "${maxTimestamp}"`
        : `pool: "${poolId}", period: "3600"`;

    const query = `{
    candles(
      first: 1
      orderBy: periodStartUnix
      orderDirection: desc
      where: { ${whereClause} }
    ) {
      close
      periodStartUnix
    }
  }`;

    const response = await fetch(ALGEBRA_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    });

    const { data, errors } = await response.json();

    if (errors) {
        throw new Error(errors[0].message);
    }

    const candle = data.candles?.[0];
    return candle ? parseFloat(candle.close) : 0;
}
