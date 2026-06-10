import { randomBytes } from 'node:crypto';
import {
  CdpClient,
  type CreatePolicyBody,
  type EvmServerAccount
} from '@coinbase/cdp-sdk';

const POLICY_DESCRIPTION = 'snapshot mcp v9';

// Snapshot off-chain EIP-712 envelopes (vote, propose, follow, ...) are all
// signed via signEvmTypedData under a domain of { name: "snapshot" } with no
// verifyingContract. The CDP policy engine is fail-secure: if no rule matches a
// signing request, it is rejected. We therefore need an explicit accept rule
// for signEvmTypedData; without one, only the typed-data shapes the engine
// happened to let through (e.g. Vote) succeed while others (Proposal) are
// rejected with a 401 "Wallet authentication error".
//
// An evmTypedDataField criterion (SignEvmTypedDataFieldCriterionSchema in the
// CDP SDK) carries the full EIP-712 type definition: `types.primaryType` (the
// root type name) and `types.types` (the EIP-712 map of type name -> field
// list). The engine uses that declaration to interpret the incoming signed
// payload and resolve the `conditions[].path` fields against it. Each criterion
// is scoped to one primaryType and matches when the request's primaryType
// equals it and every condition passes.
//
// CRITICAL: the declared struct must mirror the struct that is actually signed.
// The real Proposal envelope (snapshot.js proposalTypes / sx.js offchain
// proposeTypes) has 15 fields, not 1. A stub declaration that lists only `from`
// risks not matching the real payload, depending on whether the engine compares
// the type definition structurally before resolving conditions. We therefore
// declare the COMPLETE field set for each primaryType, copied verbatim from
// packages/sx.js/src/clients/offchain/ethereum-sig/types.ts, so the criterion
// matches exactly what is signed under every interpretation. Conditions stay a
// permissive match on the always-present `from` field, so this explicitly
// allows snapshot's typed data without being a blanket allow-everything: raw
// message signing (signEvmMessage) stays rejected and value-bearing transaction
// operations stay rejected.
//
// Vote's `choice` field type varies by voting system (uint32 / uint32[] /
// string for encrypted, ranked, weighted). EIP-712 field-name resolution is
// what the conditions need, and `from` is identical across all variants, so we
// declare the common Vote shape with the string `choice` superset; the accept
// is gated on `from` only, never on `choice`.
const SNAPSHOT_PRIMARY_TYPES: Record<
  'Vote' | 'Proposal' | 'Follow' | 'Unfollow',
  Array<{ name: string; type: string }>
> = {
  Vote: [
    { name: 'from', type: 'string' },
    { name: 'space', type: 'string' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'proposal', type: 'string' },
    { name: 'choice', type: 'string' },
    { name: 'reason', type: 'string' },
    { name: 'app', type: 'string' },
    { name: 'metadata', type: 'string' }
  ],
  Proposal: [
    { name: 'from', type: 'string' },
    { name: 'space', type: 'string' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'type', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'body', type: 'string' },
    { name: 'discussion', type: 'string' },
    { name: 'choices', type: 'string[]' },
    { name: 'labels', type: 'string[]' },
    { name: 'start', type: 'uint64' },
    { name: 'end', type: 'uint64' },
    { name: 'snapshot', type: 'uint64' },
    { name: 'plugins', type: 'string' },
    { name: 'privacy', type: 'string' },
    { name: 'app', type: 'string' }
  ],
  Follow: [
    { name: 'from', type: 'string' },
    { name: 'network', type: 'string' },
    { name: 'space', type: 'string' },
    { name: 'timestamp', type: 'uint64' }
  ],
  Unfollow: [
    { name: 'from', type: 'string' },
    { name: 'network', type: 'string' },
    { name: 'space', type: 'string' },
    { name: 'timestamp', type: 'uint64' }
  ]
};

const SNAPSHOT_TYPED_DATA_ACCEPT = {
  action: 'accept',
  operation: 'signEvmTypedData',
  criteria: (
    Object.keys(SNAPSHOT_PRIMARY_TYPES) as Array<
      keyof typeof SNAPSHOT_PRIMARY_TYPES
    >
  ).map(primaryType => ({
    type: 'evmTypedDataField',
    types: {
      primaryType,
      types: { [primaryType]: SNAPSHOT_PRIMARY_TYPES[primaryType] }
    },
    conditions: [{ path: 'from', match: '.*' }]
  }))
} as const;

const POLICY_RULES = [
  SNAPSHOT_TYPED_DATA_ACCEPT,
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

function makeCdpSigner(account: EvmServerAccount): {
  address: string;
  getAddress: () => Promise<string>;
  _signTypedData: (
    domain: Record<string, unknown>,
    types: Record<string, Array<{ name: string; type: string }>>,
    value: Record<string, unknown>
  ) => Promise<string>;
} {
  return {
    address: account.address,
    getAddress: async () => account.address,
    _signTypedData: async (domain, types, value) => {
      const primaryType = Object.keys(types).find(t => t !== 'EIP712Domain');
      if (primaryType === undefined)
        throw new Error('Could not determine primaryType from types');
      const EIP712Domain = Object.keys(domain)
        .filter(k => domain[k] !== undefined && Object.hasOwn(DOMAIN_FIELD_TYPES, k))
        .map(k => ({ name: k, type: DOMAIN_FIELD_TYPES[k] }));
      const message = Object.fromEntries(
        types[primaryType].map(({ name }) => [name, value[name]])
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

  const apiKeyId = process.env.CDP_API_KEY_ID;
  const apiKeySecret = process.env.CDP_API_KEY_SECRET;
  const walletSecret = process.env.CDP_WALLET_SECRET;
  if (!apiKeyId || !apiKeySecret || !walletSecret) {
    throw new Error(
      'CDP credentials not configured: set CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET'
    );
  }

  cdpClient = new CdpClient({ apiKeyId, apiKeySecret, walletSecret });
  return cdpClient;
}

async function ensurePolicy(): Promise<string> {
  const cdp = getCdpClient();
  const { policies } = await cdp.policies.listPolicies({ scope: 'account' });
  const existing = policies.find(p => p.description === POLICY_DESCRIPTION);
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

export async function getWalletForUser(signerKey: string): Promise<CdpSigner> {
  const cdp = getCdpClient();
  const account = await cdp.evm.getOrCreateAccount({ name: signerKey });
  const accountPolicy = await ensurePolicy();
  if (account.policies?.includes(accountPolicy) !== true) {
    await cdp.evm.updateAccount({
      address: account.address,
      update: { accountPolicy }
    });
  }
  return makeCdpSigner(account);
}

export async function createFreshAccount(): Promise<{
  signerKey: string;
  signerAddress: string;
}> {
  const signerKey = `s-${randomBytes(16).toString('hex')}`;
  const accountPolicy = await ensurePolicy();
  const account = await getCdpClient().evm.createAccount({
    name: signerKey,
    accountPolicy
  });
  return { signerKey, signerAddress: account.address };
}
