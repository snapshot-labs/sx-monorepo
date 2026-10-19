import { Contract } from '@ethersproject/contracts';
import log from './log';
import { EvmProvider, getProvider } from './provider';

/** ERC-20/721 `totalSupply()` only. */
const TOTAL_SUPPLY_ABI = ['function totalSupply() view returns (uint256)'];

/**
 * Strategies whose total supply bounds their voting power. An explicit list,
 * because `params.address` means different things in different strategies and
 * reading the wrong contract would give a wrong `V` that nothing detects. Other
 * strategies use the fallback.
 *
 * `decimals: true`: the on-chain supply is divided by `10^params.decimals` to get
 * whole tokens, the unit voting power uses.
 */
const SUPPLY_STRATEGIES: Record<string, { decimals: boolean }> = {
  'erc20-balance-of': { decimals: true },
  'erc20-votes': { decimals: true },
  'erc20-balance-of-delegation': { decimals: true },
  erc721: { decimals: false },
  'erc721-enumerable': { decimals: false }
};

export class VotingPowerBoundError extends Error {}

export interface StrategyLike {
  name: string;
  network?: string | number;
  params?: Record<string, any>;
}

/** A resolved bound and where it came from (for logging). */
export interface VotingPowerBound {
  value: number;
  source: 'strategies' | 'fallback' | 'mixed';
  /** Set when `source` is `fallback` or `mixed`: which strategy was not recognised. */
  unrecognised?: string;
}

const READ_TIMEOUT_MS = 5000;

function withTimeout<T>(
  work: Promise<T>,
  ms: number,
  what: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${what} timed out after ${ms}ms`)),
      ms
    );
    work.then(
      v => {
        clearTimeout(timer);
        resolve(v);
      },
      e => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

async function readSupply(
  address: string,
  network: string,
  block: number,
  decimals: number
): Promise<number> {
  // getProvider can also return a Starknet provider; this is an EVM read (same
  // cast as turbo.ts).
  const contract = new Contract(
    address,
    TOTAL_SUPPLY_ABI,
    getProvider(network) as EvmProvider
  );
  const raw = await withTimeout<{ toString(): string }>(
    contract.totalSupply({ blockTag: block }),
    READ_TIMEOUT_MS,
    `totalSupply(${address}@${network})`
  );
  // Whole tokens as a float. Losing precision above 2^53 is fine for an upper
  // bound that only picks a power-of-two `s`.
  return Number(raw.toString()) / 10 ** decimals;
}

/**
 * Resolve `V`, the upper bound on a proposal's total voting power: the sum of the
 * supplies of its strategies.
 *
 * - No recognised strategy: `fallbackValue`.
 * - Some recognised, some not: the larger of their supply and `fallbackValue`
 *   (not the sum, which would push every mixed space just over the fallback and
 *   double `s`).
 *
 * Throws `VotingPowerBoundError` if a recognised strategy cannot be read after
 * `attempts` tries. The caller should refuse the proposal: the value is fixed by
 * the snapshot block, so a later retry gives the same answer, while guessing too
 * low cannot be fixed later.
 */
export async function resolveVotingPowerBound(args: {
  strategies: StrategyLike[];
  proposalNetwork: string;
  snapshotBlock: number;
  fallbackValue: number;
  attempts?: number;
}): Promise<VotingPowerBound> {
  const { strategies, proposalNetwork, snapshotBlock, fallbackValue } = args;
  const attempts = args.attempts ?? 3;

  if (!strategies.length) {
    return { value: fallbackValue, source: 'fallback', unrecognised: '(none)' };
  }

  // A known strategy without `params.address` counts as unrecognised.
  const isMeasurable = (s: StrategyLike) =>
    !!SUPPLY_STRATEGIES[s.name] && typeof s.params?.address === 'string';
  const unrecognised = strategies.find(s => !isMeasurable(s))?.name;
  const measurable = strategies.filter(isMeasurable);
  if (!measurable.length) {
    return { value: fallbackValue, source: 'fallback', unrecognised };
  }

  // Each (network, address, decimals) is read once; the block is fixed, so the
  // answer is the same.
  const seen = new Map<string, number>();
  let total = 0;

  for (const s of measurable) {
    const network = String(s.network ?? proposalNetwork);
    const address = String(s.params!.address);
    const decimals = SUPPLY_STRATEGIES[s.name]!.decimals
      ? Number(s.params!.decimals ?? 18)
      : 0;
    const key = `${network}:${address.toLowerCase()}:${decimals}`;

    let supply = seen.get(key);
    if (supply === undefined) {
      let lastErr: any;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          supply = await readSupply(address, network, snapshotBlock, decimals);
          break;
        } catch (err: any) {
          lastErr = err;
          log.warn(
            `[te-vpbound] totalSupply ${address}@${network} block ${snapshotBlock} ` +
              `attempt ${attempt}/${attempts} failed: ${err?.message || err}`
          );
        }
      }
      if (supply === undefined) {
        throw new VotingPowerBoundError(
          `could not read totalSupply for ${address} on network ${network} at block ` +
            `${snapshotBlock} after ${attempts} attempts: ${lastErr?.message || lastErr}. ` +
            `The value is fixed by the snapshot block, so retrying later returns the ` +
            `same number — the proposal is refused rather than sized from a guess.`
        );
      }
      seen.set(key, supply);
    }
    total += supply;
  }

  if (unrecognised) {
    return {
      value: Math.max(total, fallbackValue),
      source: 'mixed',
      unrecognised
    };
  }
  return { value: total, source: 'strategies' };
}
