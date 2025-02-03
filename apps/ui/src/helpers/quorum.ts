import { offchainNetworks } from '@/networks';
import { NetworkID, Proposal } from '@/types';

const REJECTION_QUORUM_CHOICE_INDEX = 1;

export function getProposalCurrentQuorum(
  networkId: NetworkID,
  proposal: {
    scores: number[];
    scores_total: number;
    quorum_type?: string;
  }
) {
  if (offchainNetworks.includes(networkId)) {
    return proposal.quorum_type === 'rejection'
      ? Number(proposal.scores[REJECTION_QUORUM_CHOICE_INDEX] ?? 0)
      : Number(proposal.scores_total);
  }

  // Only For and Abstain votes are counted towards quorum progress in SX spaces.
  return Number(proposal.scores[0]) + Number(proposal.scores[2]);
}

export function quorumProgress(proposal: Proposal): number {
  return getProposalCurrentQuorum(proposal.network, proposal) / proposal.quorum;
}

export function quorumChoiceProgress(
  quorumType: Proposal['quorum_type'],
  result: { choice: number; progress: number },
  quorumProgress: number
): number {
  const cappedQuorumProgress = Math.min(quorumProgress, 1);

  if (quorumType !== 'rejection') return result.progress * cappedQuorumProgress;

  return result.choice - 1 === REJECTION_QUORUM_CHOICE_INDEX
    ? cappedQuorumProgress * 100
    : 0;
}

export function quorumLabel(quorumType: Proposal['quorum_type']): string {
  return `Quorum${quorumType === 'rejection' ? ' of reject' : ''}`;
}

export function formatQuorum(value: number) {
  const formatter = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumSignificantDigits: 3,
    roundingMode: 'trunc',
    style: 'percent'
  });

  return formatter.format(value).toLowerCase();
}
