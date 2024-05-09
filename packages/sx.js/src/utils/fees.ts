import { Account, Call, stark } from 'starknet';

// Used as workaround due to broken fee estimation in starknet@5 and RPC 0.5
const FEE_ESTIMATE_OVERRIDE = process.env.STARKNET_FEE_ESTIMATE_OVERRIDE;
const FEE_OVERHEAD = 0.5;

export async function estimateStarknetFee(account: Account, calls: Call | Call[]) {
  if (FEE_ESTIMATE_OVERRIDE) return BigInt(FEE_ESTIMATE_OVERRIDE);

  const fee = await account.estimateFee(calls);
  return stark.estimatedFeeToMaxFee(fee.suggestedMaxFee, FEE_OVERHEAD);
}
