import { Contract } from '@ethersproject/contracts';
import log from './log';
import { EvmProvider, getProvider } from './provider';

/** Minimal ERC-20/721 fragment — `totalSupply()` is all this needs. */
const TOTAL_SUPPLY_ABI = ['function totalSupply() view returns (uint256)'];

/**
 * How each known strategy yields a supply.
 *
 * An explicit allowlist rather than a heuristic over `params`. `params.address` means
 * different things in different strategies, so a heuristic that reads the wrong
 * contract produces a confidently wrong `V` that is indistinguishable from a right
 * one — and wrong-low is the direction nothing catches. An unrecognised strategy is
 * meant to be recognisable as such, and degrades to the fallback below.
 *
 * `decimals: true` means the on-chain supply is scaled by `10^params.decimals` and
 * must be normalised to the whole-token units voting power is expressed in.
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

/** One resolved bound, plus how it was arrived at — the log line needs both. */
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
  // Upstream now types getProvider as EvmProvider | StarknetProvider; this is an
  // ERC-20 totalSupply read, so narrow it the way upstream does in turbo.ts.
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
  // Whole units, as a float. Precision beyond 2^53 does not matter here and is not
  // wanted: `V` is a conservative bound feeding a power-of-two `s`, so being a few
  // parts per quadrillion high is free, and being exact buys nothing.
  return Number(raw.toString()) / 10 ** decimals;
}

/**
 * Resolve `V` for a proposal.
 *
 * Voting power is the **sum** across a proposal's strategies, so `V` is the sum of
 * their supplies. If *any* strategy is unrecognised that sum is only a lower bound,
 * so it is never used on its own:
 *
 * - none recognised: `fallbackValue`.
 * - some recognised (a mixed space): the larger of their supply and
 *   `fallbackValue`. A small supply keeps the fallback's full precision; a supply
 *   past it raises `V` with it, so `s` grows and the tally stays solvable instead
 *   of being sized for the fallback. Adding the two instead would push `V` just
 *   past the fallback on every mixed space and halve everyone's precision for it.
 *
 * Throws `VotingPowerBoundError` when a recognised strategy cannot be read after
 * `attempts` tries. The caller should refuse to create the proposal: `V` is
 * deterministic, so retrying later costs nothing but time, whereas guessing low is
 * unrecoverable.
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

  // Recognised by name but missing what the read needs counts as unrecognised,
  // rather than reaching for a different field and hoping.
  const isMeasurable = (s: StrategyLike) =>
    !!SUPPLY_STRATEGIES[s.name] && typeof s.params?.address === 'string';
  const unrecognised = strategies.find(s => !isMeasurable(s))?.name;
  const measurable = strategies.filter(isMeasurable);
  if (!measurable.length) {
    return { value: fallbackValue, source: 'fallback', unrecognised };
  }

  // One read per distinct (network, address): a proposal listing the same token twice
  // should not pay for it twice, and the block is fixed so the answer cannot differ.
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
