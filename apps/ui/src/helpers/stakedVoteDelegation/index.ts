import { Account, Call, CallData, num } from 'starknet';
import { getRpcUrl } from '@/helpers/provider';
import { shortenAddress } from '@/helpers/utils';
import { verifyStarknetNetwork } from '@/helpers/walletNetworks';
import { createProvider } from '@/networks/starknet/provider';
import {
  getStakedDelegationConfig,
  STAKED_DELEGATION_NETWORK,
  StakedDelegationNetworkId,
  ValidatorPool
} from './config';
import {
  FIXTURE_VALIDATORS,
  getFixtureMemberships,
  isFixtureStaker
} from './fixtures';

export * from './config';
export { FIXTURES_ENABLED } from './fixtures';

/** Why an address ends up voting with a given stake. */
export type ResolutionReason =
  | 'explicit'
  | 'validator'
  | 'vote-receiver'
  | 'declined'
  | 'self-stake';

export type ValidatorConfig = {
  voteReceiver: string;
  acceptsDefaultDelegations: boolean;
};

export type Membership = {
  validator: ValidatorPool;
  /** Member stake in this pool, in wei. */
  amount: bigint;
  votesWith: string;
  reason: ResolutionReason;
};

const SCAN_CONCURRENCY = 12;
const ZERO = 0n;

const providers: Partial<
  Record<StakedDelegationNetworkId, ReturnType<typeof createProvider>>
> = {};

function getStarkProvider(networkId: StakedDelegationNetworkId) {
  providers[networkId] ??= createProvider(getRpcUrl(networkId));
  return providers[networkId]!;
}

export function normalizeAddress(address: string | bigint) {
  return num.toHex64(num.toBigInt(address));
}

export function isSameAddress(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  try {
    return num.toBigInt(a) === num.toBigInt(b);
  } catch {
    return false;
  }
}

export function isValidStarknetAddress(value: string) {
  if (!/^0x[0-9a-fA-F]{1,64}$/.test(value)) return false;
  const n = num.toBigInt(value);
  // Max valid contract address is 2**251 - 1
  return n > ZERO && n < 2n ** 251n;
}

function requireRegistry(networkId: StakedDelegationNetworkId) {
  const { registry, name } = getStakedDelegationConfig(networkId);
  if (!registry) {
    throw new Error(`The delegation registry is not deployed on ${name} yet.`);
  }
  return registry;
}

async function callRegistry(
  entrypoint: string,
  calldata: string[],
  networkId: StakedDelegationNetworkId
) {
  return getStarkProvider(networkId).callContract({
    contractAddress: requireRegistry(networkId),
    entrypoint,
    calldata
  });
}

/** Explicit delegate registered by `delegator`, or `null` if none is set. */
export async function getDelegatee(
  delegator: string,
  networkId = STAKED_DELEGATION_NETWORK
): Promise<string | null> {
  const [delegatee] = await callRegistry(
    'get_delegatee',
    [delegator],
    networkId
  );
  return num.toBigInt(delegatee) === ZERO ? null : normalizeAddress(delegatee);
}

export async function getValidatorConfig(
  staker: string,
  networkId = STAKED_DELEGATION_NETWORK
): Promise<ValidatorConfig> {
  const [voteReceiver, accepts] = await callRegistry(
    'get_validator_config',
    [staker],
    networkId
  );
  return {
    voteReceiver: normalizeAddress(voteReceiver),
    acceptsDefaultDelegations: num.toBigInt(accepts) === 1n
  };
}

/** Whether `address` is a registered validator in the staking contract. */
export async function getIsStaker(
  address: string,
  networkId = STAKED_DELEGATION_NETWORK
): Promise<boolean> {
  if (isFixtureStaker(address)) return true;
  const { staking } = getStakedDelegationConfig(networkId);
  const [variant] = await getStarkProvider(networkId).callContract({
    contractAddress: staking,
    entrypoint: 'get_staker_info_v1',
    calldata: [address]
  });
  // Option::Some is variant 0
  return num.toBigInt(variant) === ZERO;
}

/**
 * Same rules as `resolve_pool_member` in the registry (computed locally so a
 * single delegatee lookup covers every pool).
 */
export function resolvePoolMember(
  delegator: string,
  staker: string,
  delegatee: string | null,
  config: ValidatorConfig
): { votesWith: string; reason: ResolutionReason } {
  if (delegatee) return { votesWith: delegatee, reason: 'explicit' };
  if (!config.acceptsDefaultDelegations) {
    return { votesWith: normalizeAddress(delegator), reason: 'declined' };
  }
  return {
    votesWith: config.voteReceiver,
    reason: isSameAddress(config.voteReceiver, staker)
      ? 'validator'
      : 'vote-receiver'
  };
}

async function getPoolMemberAmount(
  pool: string,
  member: string,
  networkId: StakedDelegationNetworkId
): Promise<bigint> {
  const provider = getStarkProvider(networkId);
  let result: string[];
  try {
    result = await provider.callContract({
      contractAddress: pool,
      entrypoint: 'get_pool_member_info_v1',
      calldata: [member]
    });
  } catch {
    // Pools that were never upgraded only expose the V0 getter.
    result = await provider.callContract({
      contractAddress: pool,
      entrypoint: 'get_pool_member_info',
      calldata: [member]
    });
  }
  // Option::Some(info) => [0, reward_address, amount, ...], None => [1]
  if (num.toBigInt(result[0]) !== ZERO) return ZERO;
  return num.toBigInt(result[2]);
}

/**
 * Finds the STRK delegation pools `member` holds stake in. The staking
 * contract has no reverse lookup, so this checks every pool that has stake.
 */
export async function findMemberships(
  member: string,
  onProgress?: (done: number, total: number) => void,
  networkId = STAKED_DELEGATION_NETWORK
): Promise<{ validator: ValidatorPool; amount: bigint }[]> {
  const fixture = getFixtureMemberships(member);
  if (fixture) {
    onProgress?.(1, 1);
    return fixture.flatMap(({ staker, amount }) => {
      const validator = getValidator(staker, networkId);
      return validator ? [{ validator, amount }] : [];
    });
  }

  const pools = getValidators(networkId).filter(
    validator =>
      BigInt(validator.delegated) > ZERO && !isFixtureStaker(validator.staker)
  );
  const found: { validator: ValidatorPool; amount: bigint }[] = [];
  let cursor = 0;
  let done = 0;

  const worker = async () => {
    while (cursor < pools.length) {
      const validator = pools[cursor++];
      try {
        const amount = await getPoolMemberAmount(
          validator.pool,
          member,
          networkId
        );
        if (amount > ZERO) found.push({ validator, amount });
      } catch (err) {
        console.warn('pool member lookup failed', validator.pool, err);
      } finally {
        onProgress?.(++done, pools.length);
      }
    }
  };

  await Promise.all(Array.from({ length: SCAN_CONCURRENCY }, worker));
  return found.sort((a, b) => (b.amount > a.amount ? 1 : -1));
}

/** Validators with a STRK pool, largest delegated stake first. */
export function getValidators(
  networkId = STAKED_DELEGATION_NETWORK
): ValidatorPool[] {
  const { validators } = getStakedDelegationConfig(networkId).pools;
  if (!FIXTURE_VALIDATORS.length) return validators;
  return [...FIXTURE_VALIDATORS, ...validators].sort((a, b) =>
    BigInt(b.delegated) > BigInt(a.delegated) ? 1 : -1
  );
}

/** Validator name when known, otherwise a shortened address. */
export function shortenVoter(address: string) {
  return getValidator(address)?.name ?? shortenAddress(address);
}

export function getValidator(
  staker: string,
  networkId = STAKED_DELEGATION_NETWORK
): ValidatorPool | null {
  return (
    getValidators(networkId).find(validator =>
      isSameAddress(validator.staker, staker)
    ) ?? null
  );
}

function registryCall(
  entrypoint: string,
  calldata: Call['calldata'],
  networkId: StakedDelegationNetworkId
): Call {
  return {
    contractAddress: requireRegistry(networkId),
    entrypoint,
    calldata
  };
}

export const registryCalls = {
  delegate: (delegatee: string, networkId = STAKED_DELEGATION_NETWORK) =>
    registryCall('delegate', CallData.compile({ delegatee }), networkId),
  resetDelegation: (networkId = STAKED_DELEGATION_NETWORK) =>
    registryCall('reset_delegation', [], networkId),
  setVoteReceiver: (receiver: string, networkId = STAKED_DELEGATION_NETWORK) =>
    registryCall(
      'set_vote_receiver',
      CallData.compile({ receiver }),
      networkId
    ),
  setAcceptsDefaultDelegations: (
    accepts: boolean,
    networkId = STAKED_DELEGATION_NETWORK
  ) =>
    registryCall(
      'set_accepts_default_delegations',
      CallData.compile({ accepts: accepts ? 1 : 0 }),
      networkId
    )
};

/**
 * Sends `call` from the connected Starknet wallet. `web3` is the provider
 * returned by `useWeb3().auth.value.provider`.
 */
export async function sendRegistryCall(
  web3: any,
  call: Call,
  networkId = STAKED_DELEGATION_NETWORK
): Promise<string> {
  const { chainId } = getStakedDelegationConfig(networkId);
  await verifyStarknetNetwork(web3, chainId);
  const account: Account | undefined = web3?.provider?.account;
  if (!account) throw new Error('Connect a Starknet wallet to continue.');
  const { transaction_hash } = await account.execute(call);
  return transaction_hash;
}

export async function waitForRegistryTransaction(
  txHash: string,
  networkId = STAKED_DELEGATION_NETWORK
) {
  return getStarkProvider(networkId).waitForTransaction(txHash, {
    retryInterval: 3000
  });
}
