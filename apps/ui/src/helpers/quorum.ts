import { Proposal } from '@/types';

const REJECTION_QUORUM_CHOICE_INDEX = 1;

export function quorumProgress(proposal: Proposal): number {
  const totalScore =
    proposal.quorum_type === 'rejection'
      ? proposal.scores[REJECTION_QUORUM_CHOICE_INDEX] ?? 0
      : proposal.scores_total;

  return totalScore / proposal.quorum;
}

export function quorumChoiceProgress(
  quorumType: Proposal['quorum_type'],
  result: { choice: number; progress: number },
  quorumProgress: number
): number {
  const cappedQuorumProgress = Math.min(quorumProgress, 1);

  if (quorumType !== 'rejection') return result.progress * cappedQuorumProgress;

  return result.choice - 1 === REJECTION_QUORUM_CHOICE_INDEX ? cappedQuorumProgress * 100 : 0;
}

export function quorumLabel(quorumType: Proposal['quorum_type']): string {
  return `Quorum${quorumType === 'rejection' ? ' of reject' : ''}`;
}
