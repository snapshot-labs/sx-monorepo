import { Proposal } from '@/types';

const REJECTION_QUORUM_CHOICE_INDEX = 1;

export function quorumProgress(proposal: Proposal): number {
  const totalScore =
    proposal.quorum_type === 'rejection'
      ? proposal.scores
          .filter((c, i) => i === REJECTION_QUORUM_CHOICE_INDEX)
          .reduce((a, b) => a + b, 0)
      : proposal.scores_total;

  return Math.min(totalScore / proposal.quorum, 1);
}

export function quorumChoiceProgress(
  quorumType: Proposal['quorum_type'],
  result: { choice: number; progress: number },
  quorumProgress: number
): number {
  if (quorumType !== 'rejection') return result.progress * quorumProgress;

  return result.choice - 1 === REJECTION_QUORUM_CHOICE_INDEX ? quorumProgress * 100 : 0;
}

export function quorumLabel(quorumType: Proposal['quorum_type']): string {
  return `Quorum${quorumType === 'rejection' ? ' of reject' : ''}`;
}
