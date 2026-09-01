import { randomBytes } from 'node:crypto';
import {
  CdpClient,
  CreatePolicyBody,
  EvmServerAccount
} from '@coinbase/cdp-sdk';
import {
  CDP_API_KEY_ID,
  CDP_API_KEY_SECRET,
  CDP_WALLET_SECRET
} from './config';

const POLICY_DESCRIPTION = 'snapshot agent v1';

const POLICY_RULES = [
  ...['signEvmTransaction', 'sendEvmTransaction'].map(operation => ({
    action: 'reject',
    operation,
    criteria: [{ type: 'ethValue', ethValue: '0', operator: '>=' }]
  })),
  {
    action: 'reject',
    operation: 'signEvmMessage',
    criteria: [{ type: 'evmMessage', match: '.*' }]
  }
] as const;

const DOMAIN_FIELD_TYPES: Record<string, string> = {
  name: 'string',
  version: 'string',
  chainId: 'uint256',
  verifyingContract: 'address',
  salt: 'bytes32'
};

export type CdpSigner = ReturnType<typeof makeCdpSigner>;

function makeCdpSigner(account: EvmServerAccount) {
  return {
    address: account.address,
    getAddress: async () => account.address,
    _signTypedData: async (
      domain: Record<string, unknown>,
      types: Record<string, { name: string; type: string }[]>,
      value: Record<string, unknown>
    ) => {
      const primaryType = Object.keys(types).find(
        type => type !== 'EIP712Domain'
      );
      if (!primaryType) throw new Error('could not determine primaryType');

      const EIP712Domain = Object.keys(domain)
        .filter(
          key =>
            domain[key] !== undefined && Object.hasOwn(DOMAIN_FIELD_TYPES, key)
        )
        .map(key => ({ name: key, type: DOMAIN_FIELD_TYPES[key] }));
      const message = Object.fromEntries(
        (types[primaryType] ?? []).map(({ name }) => [name, value[name]])
      );

      return account.signTypedData({
        domain,
        types: { ...types, EIP712Domain },
        primaryType,
        message
      } as Parameters<EvmServerAccount['signTypedData']>[0]);
    }
  };
}

let cdpClient: CdpClient | null = null;

function getCdpClient(): CdpClient {
  if (cdpClient) return cdpClient;

  if (!CDP_API_KEY_ID || !CDP_API_KEY_SECRET || !CDP_WALLET_SECRET) {
    throw new Error(
      'CDP_API_KEY_ID, CDP_API_KEY_SECRET and CDP_WALLET_SECRET must be set'
    );
  }

  cdpClient = new CdpClient({
    apiKeyId: CDP_API_KEY_ID,
    apiKeySecret: CDP_API_KEY_SECRET,
    walletSecret: CDP_WALLET_SECRET
  });

  return cdpClient;
}

/** Signing votes is the only thing these accounts may do, so a policy rejects everything else. */
async function ensurePolicy(): Promise<string> {
  const cdp = getCdpClient();
  const { policies } = await cdp.policies.listPolicies({ scope: 'account' });
  const existing = policies.find(
    policy => policy.description === POLICY_DESCRIPTION
  );
  if (existing) return existing.id;

  const created = await cdp.policies.createPolicy({
    policy: {
      scope: 'account',
      description: POLICY_DESCRIPTION,
      rules: POLICY_RULES as unknown as CreatePolicyBody['rules']
    }
  });

  return created.id;
}

export async function createAccount(): Promise<{
  name: string;
  address: string;
}> {
  const name = `a-${randomBytes(16).toString('hex')}`;
  const account = await getCdpClient().evm.createAccount({
    name,
    accountPolicy: await ensurePolicy()
  });

  return { name, address: account.address };
}

export async function getSigner(name: string): Promise<CdpSigner> {
  return makeCdpSigner(await getCdpClient().evm.getAccount({ name }));
}
