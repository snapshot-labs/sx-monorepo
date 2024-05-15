import { Account, Call, stark } from 'starknet';
import { NetworkConfig } from '../types';

const FEE_OVERHEAD = 0.5;

export async function estimateStarknetFee(
  account: Account,
  networkConfig: NetworkConfig,
  calls: Call | Call[]
) {
  if (networkConfig.feeEstimateOverride) return BigInt(networkConfig.feeEstimateOverride);

  const fee = await account.estimateFee(calls);
  return stark.estimatedFeeToMaxFee(fee.suggestedMaxFee, FEE_OVERHEAD);
}
