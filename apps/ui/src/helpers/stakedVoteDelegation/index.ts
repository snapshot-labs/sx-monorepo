import { Account, Call, CallData, hash, num } from 'starknet';
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
  FIXTURE_PROFILES,
  FIXTURE_VALIDATORS,
  getFixtureMemberships,
  isFixtureStaker
} from './fixtures';
import { VALIDATOR_PROFILES, ValidatorProfile } from './validatorProfiles';

export * from './config';
export { FIXTURES_ENABLED } from './fixtures';
export type { ValidatorProfile } from './validatorProfiles';

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
  /** Validator's registry settings, kept to preview other choices. */
  config: ValidatorConfig;
};

const SCAN_CONCURRENCY = 12;

/**
 * Multicall contract (`aggregate`), deployed at the same address on Starknet
 * mainnet and Sepolia. Lets one request check many pools.
 */
const MULTICALL =
  '0x05754af3760f3356da99aea5c3ec39ccac7783d925a19666ebbeca58ff0087f4';
const MULTICALL_BATCH_SIZE = 100;
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
  return parseValidatorConfig(
    await callRegistry('get_validator_config', [staker], networkId)
  );
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

export type VoterShare = { address: string; amount: bigint; share: number };

/**
 * Who votes with `delegator`'s pool stake if their delegate were `delegatee`
 * (`null` = default), summed per voting address, largest first.
 */
export function aggregateVoters(
  delegator: string,
  memberships: Pick<Membership, 'validator' | 'amount' | 'config'>[],
  delegatee: string | null
): VoterShare[] {
  const total = memberships.reduce((sum, m) => sum + m.amount, ZERO);
  const byVoter = new Map<string, bigint>();
  for (const m of memberships) {
    const { votesWith } = resolvePoolMember(
      delegator,
      m.validator.staker,
      delegatee,
      m.config
    );
    const key = normalizeAddress(votesWith);
    byVoter.set(key, (byVoter.get(key) ?? ZERO) + m.amount);
  }
  return [...byVoter.entries()]
    .map(([address, amount]) => ({
      address,
      amount,
      share: total > ZERO ? Number((amount * 10000n) / total) / 10000 : 0
    }))
    .sort((a, b) => (b.amount > a.amount ? 1 : -1));
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

type ViewCall = {
  contractAddress: string;
  entrypoint: string;
  calldata: string[];
};

/**
 * Runs several view calls in one `aggregate` request and returns each call's
 * result. Throws if any call fails.
 */
async function multicall(
  calls: ViewCall[],
  networkId: StakedDelegationNetworkId
): Promise<string[][]> {
  const callArray: string[] = [];
  const calldata: string[] = [];
  for (const call of calls) {
    callArray.push(
      call.contractAddress,
      hash.getSelectorFromName(call.entrypoint),
      calldata.length.toString(),
      call.calldata.length.toString()
    );
    calldata.push(...call.calldata);
  }
  const result = await getStarkProvider(networkId).callContract({
    contractAddress: MULTICALL,
    entrypoint: 'aggregate',
    calldata: [
      calls.length.toString(),
      ...callArray,
      calldata.length.toString(),
      ...calldata
    ]
  });

  // [block_number, retdata_len, (len, ...retdata) per call]
  const results: string[][] = [];
  let i = 2;
  for (let call = 0; call < calls.length; call++) {
    const len = Number(num.toBigInt(result[i]));
    results.push(result.slice(i + 1, i + 1 + len));
    i += 1 + len;
  }
  return results;
}

/** Member amount in each pool (0 when not a member), in one request. */
async function getPoolMemberAmountsBatch(
  pools: string[],
  member: string,
  networkId: StakedDelegationNetworkId
): Promise<bigint[]> {
  const results = await multicall(
    pools.map(pool => ({
      contractAddress: pool,
      entrypoint: 'get_pool_member_info_v1',
      calldata: [member]
    })),
    networkId
  );
  // Option::Some(info) => [0, reward_address, amount, ...], None => [1]
  return results.map(data =>
    data.length > 2 && num.toBigInt(data[0]) === ZERO
      ? num.toBigInt(data[2])
      : ZERO
  );
}

function parseValidatorConfig([voteReceiver, accepts]: string[]) {
  return {
    voteReceiver: normalizeAddress(voteReceiver),
    acceptsDefaultDelegations: num.toBigInt(accepts) === 1n
  };
}

/** Registry settings for several validators in one request. */
export async function getValidatorConfigs(
  stakers: string[],
  networkId = STAKED_DELEGATION_NETWORK
): Promise<ValidatorConfig[]> {
  if (!stakers.length) return [];
  const registry = requireRegistry(networkId);
  try {
    const results = await multicall(
      stakers.map(staker => ({
        contractAddress: registry,
        entrypoint: 'get_validator_config',
        calldata: [staker]
      })),
      networkId
    );
    return results.map(parseValidatorConfig);
  } catch {
    return Promise.all(
      stakers.map(staker => getValidatorConfig(staker, networkId))
    );
  }
}

async function scanPoolsOneByOne(
  pools: ValidatorPool[],
  member: string,
  networkId: StakedDelegationNetworkId,
  report: (count: number) => void
) {
  const found: { validator: ValidatorPool; amount: bigint }[] = [];
  let cursor = 0;
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
        report(1);
      }
    }
  };
  await Promise.all(Array.from({ length: SCAN_CONCURRENCY }, worker));
  return found;
}

/**
 * Finds the STRK delegation pools `member` holds stake in. The staking
 * contract has no reverse lookup, so this checks every listed pool.
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

  // Check every listed pool, including ones that were empty when the list was
  // built: they may have received stake since.
  const pools = getValidators(networkId).filter(
    validator => !isFixtureStaker(validator.staker)
  );
  const found: { validator: ValidatorPool; amount: bigint }[] = [];
  let done = 0;
  const report = (count: number) => onProgress?.((done += count), pools.length);

  const batches: ValidatorPool[][] = [];
  for (let i = 0; i < pools.length; i += MULTICALL_BATCH_SIZE) {
    batches.push(pools.slice(i, i + MULTICALL_BATCH_SIZE));
  }

  await Promise.all(
    batches.map(async batch => {
      try {
        const amounts = await getPoolMemberAmountsBatch(
          batch.map(validator => validator.pool),
          member,
          networkId
        );
        batch.forEach((validator, i) => {
          if (amounts[i] > ZERO) found.push({ validator, amount: amounts[i] });
        });
        report(batch.length);
      } catch (err) {
        // A pool in the batch may lack the V1 getter: check one by one.
        console.warn('batched pool lookup failed, checking one by one', err);
        found.push(
          ...(await scanPoolsOneByOne(batch, member, networkId, report))
        );
      }
    })
  );

  return found.sort((a, b) => (b.amount > a.amount ? 1 : -1));
}

/** Validators with a STRK pool, largest delegated stake first. */
export function getValidators(
  networkId = STAKED_DELEGATION_NETWORK
): ValidatorPool[] {
  const { validators } = getStakedDelegationConfig(networkId).pools;
  const all = FIXTURE_VALIDATORS.length
    ? [...FIXTURE_VALIDATORS, ...validators].sort((a, b) =>
        BigInt(b.delegated) > BigInt(a.delegated) ? 1 : -1
      )
    : validators;
  return all.map(validator => {
    const profile = getValidatorProfile(validator.staker, networkId);
    return profile ? { ...validator, name: profile.name } : validator;
  });
}

/** Profile from validatorProfiles.ts (or local fixtures), if any. */
export function getValidatorProfile(
  staker: string,
  networkId = STAKED_DELEGATION_NETWORK
): ValidatorProfile | null {
  let key: string;
  try {
    key = normalizeAddress(staker);
  } catch {
    return null;
  }
  return VALIDATOR_PROFILES[networkId][key] ?? FIXTURE_PROFILES[key] ?? null;
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
