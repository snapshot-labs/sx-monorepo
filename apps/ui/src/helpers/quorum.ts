import { offchainNetworks } from '@/networks';
import { NetworkID, Proposal, VoteType } from '@/types';

const REJECTION_QUORUM_CHOICE_INDEX = 1;
const SCORES_FOR_INDEX = 0;
const SCORES_AGAINST_INDEX = 1;
const SCORES_ABSTAIN_INDEX = 2;

export function getProposalCurrentQuorum(
  networkId: NetworkID,
  proposal: {
    scores: number[];
    type: VoteType;
    scores_total: number;
    quorum_type?: string;
    hide_abstain?: boolean;
  }
) {
  if (offchainNetworks.includes(networkId)) {
    if (proposal.quorum_type === 'rejection') {
      return proposal.scores[REJECTION_QUORUM_CHOICE_INDEX] ?? 0;
    }

    if (proposal.hide_abstain && proposal.type === 'basic') {
      return (
        proposal.scores[SCORES_FOR_INDEX] +
        proposal.scores[SCORES_AGAINST_INDEX]
      );
    }

    return proposal.scores_total;
  }

  // Only For and Abstain votes are counted towards quorum progress in SX spaces.
  return (
    Number(proposal.scores[SCORES_FOR_INDEX]) +
    Number(proposal.scores[SCORES_ABSTAIN_INDEX])
  );
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
