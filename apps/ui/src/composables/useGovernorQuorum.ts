import { call } from '@/helpers/call';
import { getProvider } from '@/helpers/provider';
import { getNetwork } from '@/networks';
import { Proposal } from '@/types';

/**
 * TEMPORARY STOPGAP (tied to indexer PR snapshot-labs/sx-monorepo#2172).
 *
 * For OpenZeppelin Governor spaces the quorum is computed on-chain as
 *   quorum(timepoint) = quorumNumerator(timepoint) * pastTotalSupply(timepoint)
 * evaluated at the proposal's vote-start (snapshot) block.
 *
 * The indexer currently stored the value read at proposal-CREATION block
 * instead of the snapshot block, so `proposal.quorum` can be wrong. Until the
 * indexer fix lands + spaces are resynced, we override the displayed value by
 * reading `quorum(snapshotBlock)` directly from the governor contract
 * client-side. This is scoped to `@openzeppelin/governor` proposals only, so
 * native SX / offchain / governor-bravo spaces are unaffected, and it falls
 * back to the indexed value on any failure.
 */
const OZ_GOVERNOR_PROTOCOL = '@openzeppelin/governor';

const GOVERNOR_QUORUM_ABI = [
  'function quorum(uint256 timepoint) view returns (uint256)'
];

// Cache resolved quorum per proposal (id is unique) to avoid refetching.
const cache = new Map<string, number>();

function isOzGovernorProposal(proposal: Proposal): boolean {
  return proposal.space.protocol === OZ_GOVERNOR_PROTOCOL;
}

export function useGovernorQuorum(proposal: MaybeRefOrGetter<Proposal>) {
  // Start from the indexed value so the UI is never empty / broken.
  const quorum = ref(toValue(proposal).quorum);

  watchEffect(async () => {
    const p = toValue(proposal);
    quorum.value = p.quorum;

    if (!isOzGovernorProposal(p) || !p.snapshot) return;

    const cached = cache.get(p.id);
    if (cached !== undefined) {
      quorum.value = cached;
      return;
    }

    try {
      const { chainId } = getNetwork(p.network);
      const provider = getProvider(Number(chainId));
      // For OZ governor spaces the space id is the governor contract address.
      const result = await call(provider, GOVERNOR_QUORUM_ABI, [
        p.space.id,
        'quorum',
        [p.snapshot]
      ]);

      const onchainQuorum = Number(result.toString());
      if (Number.isFinite(onchainQuorum) && onchainQuorum > 0) {
        cache.set(p.id, onchainQuorum);
        quorum.value = onchainQuorum;
      }
    } catch (err) {
      // Keep the indexed fallback on any read failure.
      console.warn('[useGovernorQuorum] on-chain quorum read failed', err);
    }
  });

  return { quorum };
}
