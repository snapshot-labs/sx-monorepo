import { SubProviderId, VERIFICATION_PROVIDER_SIGNERS } from '..';
import { VerificationContext, VerificationProvider } from './';
import { sumsubProvider } from './sumsub';
import { zkpassportProvider } from './zkpassport';

const SUB_PROVIDERS = {
  zkpassport: zkpassportProvider,
  sumsub: sumsubProvider
};

function wrapRpcCall(
  rpcCall: VerificationContext['rpcCall'],
  subProviderId: SubProviderId
): VerificationContext['rpcCall'] {
  return (method: string, params: object) => {
    const p = params as Record<string, unknown>;
    return rpcCall(method, {
      ...p,
      provider: 'zkpassportOrSumsub',
      metadata: {
        ...(p.metadata || {}),
        zkpassportOrSumsub: { subProviderId }
      }
    });
  };
}

export const zkpassportOrSumsubProvider: VerificationProvider = {
  id: 'zkpassportOrSumsub',
  name: 'Passport or ID',
  signer: VERIFICATION_PROVIDER_SIGNERS.zkpassportOrSumsub,
  startVerification: async (context, subProviderId) => {
    if (!subProviderId) return;

    await SUB_PROVIDERS[subProviderId].startVerification({
      ...context,
      rpcCall: wrapRpcCall(context.rpcCall, subProviderId)
    });
  }
};
