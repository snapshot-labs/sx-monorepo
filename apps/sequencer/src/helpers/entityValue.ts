import { jsonRpcRequest } from './utils';

type Proposal = {
  network: string;
  strategies: any[];
  start: number;
};

const OVERLORD_URL =
  process.env.OVERLORD_URL ?? 'https://overlord.snapshot.box';
// Round strategy values to 9 decimal places
const STRATEGIES_VALUE_PRECISION = 9;

export async function getVpValueByStrategy(
  proposal: Proposal
): Promise<number[]> {
  const result: number[] = await jsonRpcRequest(
    OVERLORD_URL,
    'get_value_by_strategy',
    {
      network: proposal.network,
      strategies: proposal.strategies,
      snapshot: proposal.start // Expecting timestamp and not block number
    }
  );

  // Handle unlikely case where strategies value array length does not match strategies length
  if (result.length !== proposal.strategies.length) {
    throw new Error('Strategies value length mismatch');
  }

  return result.map(value =>
    parseFloat(value.toFixed(STRATEGIES_VALUE_PRECISION))
  );
}
