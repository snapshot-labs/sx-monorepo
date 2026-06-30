import { call } from '@/helpers/call';
import { getProvider } from '@/helpers/provider';
import { getNetwork } from '@/networks';
import { Proposal } from '@/types';

/**
 * TEMPORARY SINGLE-SPACE STOPGAP (tied to indexer PR
 * snapshot-labs/sx-monorepo#2172 + space resync).
 *
 * For this one OpenZeppelin Governor space the indexer stored `quorum` read at
 * the proposal-CREATION block instead of the snapshot block, so
 * `proposal.quorum` can be wrong. Until the indexer fix lands + the space is
 * resynced we read `quorum(snapshotBlock)` directly from the governor contract
 * client-side, falling back to the indexed value on any error.
 *
 * Scoped to ONLY the affected Arbitrum space (`arb1:<governor address>`); every
 * other space - including other OZ-governor spaces - uses the indexed
 * `proposal.quorum` unchanged. Remove this whole composable once the resync is
 * done.
 */
const ABI = ['function quorum(uint256 timepoint) view returns (uint256)'];

// The only space the override applies to, in the UI `<network>:<address>` form.
const AFFECTED_SPACE_ID =
  'arb1:0x789fC99093B09aD01C34DC7251D0C89ce743e5a4'.toLowerCase();

// Cache the resolved on-chain quorum per proposal (id is unique).
const cache = new Map<string, Promise<number>>();

async function resolveQuorum(proposal: Proposal): Promise<number> {
  const spaceId = `${proposal.network}:${proposal.space.id}`.toLowerCase();
  if (spaceId !== AFFECTED_SPACE_ID || !proposal.snapshot) {
    return proposal.quorum;
  }

  let promise = cache.get(proposal.id);
  if (!promise) {
    promise = (async () => {
      try {
        const { chainId } = getNetwork(proposal.network);
        const provider = getProvider(Number(chainId));
        // For OZ governor spaces the space id is the governor contract address.
        const result = await call(provider, ABI, [
          proposal.space.id,
          'quorum',
          [proposal.snapshot]
        ]);
        const onchain = Number(result.toString());
        return Number.isFinite(onchain) && onchain > 0
          ? onchain
          : proposal.quorum;
      } catch {
        return proposal.quorum;
      }
    })();
    cache.set(proposal.id, promise);
  }

  return promise;
}

/**
 * Returns the proposal with its `quorum` corrected for OZ-governor spaces.
 * Starts from the indexed value so the UI is never empty, then patches it in
 * once the on-chain read resolves.
 */
export function useGovernorQuorum(proposal: MaybeRefOrGetter<Proposal>) {
  const quorum = ref(toValue(proposal).quorum);

  watchEffect(async () => {
    const p = toValue(proposal);
    quorum.value = p.quorum;
    quorum.value = await resolveQuorum(p);
  });

  const corrected = computed(() => ({
    ...toValue(proposal),
    quorum: quorum.value
  }));

  return { proposal: corrected };
}
