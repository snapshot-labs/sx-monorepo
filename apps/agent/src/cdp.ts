import { CdpClient } from '@coinbase/cdp-sdk';
import { getAddress } from 'viem';
import crypto from 'crypto';

const cdp = new CdpClient();

export async function createAgentAccount() {
  const name = `a-${crypto.randomBytes(15).toString('hex')}`;
  const account = await cdp.evm.getOrCreateAccount({ name });
  return { name, address: account.address };
}

export function getCdpSigner(agentName: string, agentAddress: string) {
  return {
    getAddress: async () => getAddress(agentAddress),
    _signTypedData: async (
      domain: Record<string, any>,
      types: Record<string, { name: string; type: string }[]>,
      message: Record<string, any>
    ) => {
      const account = await cdp.evm.getOrCreateAccount({ name: agentName });
      const primaryType = Object.keys(types)[0] as string;
      return account.signTypedData({ domain, types, primaryType, message });
    }
  } as any;
}
