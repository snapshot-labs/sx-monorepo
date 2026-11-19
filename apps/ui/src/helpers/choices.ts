import { Choice, Proposal, ScoresTick, VoteType } from '@/types';

type TickVote = { choice: Choice; vp: number; created: number };
type Ballot = { ranking: number[]; vp: number };

const TICK_INTERVAL = 3600;
// Also the number of --choice-N colors in style.scss
const MAX_CHOICES = 6;
const BASIC_COLORS = ['--success', '--danger', '--text'].map(
  name => `rgb(var(${name}))`
);

export const OTHERS_COLOR = 'rgb(var(--text))';

export const SCORES_TICKS_TYPES: VoteType[] = [
  'basic',
  'single-choice',
  'approval',
  'ranked-choice',
  'quadratic',
  'weighted'
];

/**
 * Number of leading choices to show one by one, the next ones being grouped
 * as "Others". A lone extra choice is shown rather than grouped.
 */
export function getVisibleChoicesCount(choicesCount: number) {
  return choicesCount === MAX_CHOICES + 1 ? choicesCount : MAX_CHOICES;
}

/**
 * Returns the color of each choice, by choice index.
 * Colors go by score: the leading choice gets the first color, the next one
 * the second color and so on. Choices after the last color get none.
 */
export function getChoiceColors(
  proposal: Pick<Proposal, 'type' | 'choices' | 'scores'>
): (string | undefined)[] {
  if (proposal.type === 'basic') return BASIC_COLORS;

  const colors: (string | undefined)[] = proposal.choices.map(() => undefined);
  [...proposal.choices.keys()]
    .sort((a, b) => (proposal.scores[b] ?? 0) - (proposal.scores[a] ?? 0))
    .slice(0, MAX_CHOICES)
    .forEach((choice, rank) => {
      colors[choice] = `var(--choice-${rank + 1})`;
    });

  return colors;
}

// Instant-runoff: drop the last choice until one has the majority,
// same as snapshot.js so the last tick matches the proposal scores.
function getRankedChoiceScores(ballots: Ballot[], count: number) {
  const total = ballots.reduce((sum, { vp }) => sum + vp, 0);
  const tops = ballots.map(() => 0);
  const dropped = new Set<number>();

  for (;;) {
    const scores = Array<number>(count).fill(0);
    ballots.forEach(({ ranking, vp }, i) => {
      // Rankings are complete, so there is always a choice left
      while (dropped.has(ranking[tops[i]])) tops[i]++;
      scores[ranking[tops[i]] - 1] += vp;
    });

    const running = [...scores.keys()].filter(i => !dropped.has(i + 1));
    if (
      !ballots.length ||
      running.length < 3 ||
      Math.max(...scores) > total / 2
    ) {
      return scores;
    }

    dropped.add(running.reduce((a, b) => (scores[b] < scores[a] ? b : a)) + 1);
  }
}

/**
 * Replays votes (sorted by creation date) to get the scores of each choice
 * over time, one tick per hour with votes. Invalid votes are ignored, like
 * in the proposal scores.
 */
export function getScoresTicks(
  type: VoteType,
  choicesCount: number,
  votes: TickVote[]
): ScoresTick[] {
  const isChoice = (choice: unknown): choice is number =>
    Number.isInteger(choice) &&
    (choice as number) >= 1 &&
    (choice as number) <= choicesCount;
  const isChoices = (choice: Choice): choice is number[] =>
    Array.isArray(choice) &&
    choice.every(isChoice) &&
    new Set(choice).size === choice.length;
  const getTimestamp = (vote: TickVote) =>
    Math.floor(vote.created / TICK_INTERVAL) * TICK_INTERVAL;

  const isWeighted = type === 'weighted' || type === 'quadratic';
  // Voting power by choice so far, as square roots on quadratic voting
  const sums = Array<number>(choicesCount).fill(0);
  const ballots: Ballot[] = [];
  let total = 0;

  function addVote({ choice, vp }: TickVote) {
    if (type === 'ranked-choice') {
      // Rankings sent as strings count too
      const ranking = Array.isArray(choice) ? choice.map(Number) : [];
      if (isChoices(ranking) && ranking.length === choicesCount) {
        ballots.push({ ranking, vp });
      }
    } else if (type === 'approval') {
      if (isChoices(choice)) for (const c of choice) sums[c - 1] += vp;
    } else if (!isWeighted) {
      if (isChoice(choice)) sums[choice - 1] += vp;
    } else if (typeof choice === 'object' && !Array.isArray(choice)) {
      const weights = Object.entries(choice ?? {});
      const isValid = weights.every(
        ([c, weight]) =>
          isChoice(Number(c)) && typeof weight === 'number' && weight >= 0
      );
      const weightsTotal = weights.reduce((sum, [, weight]) => sum + weight, 0);
      if (!isValid || !(weightsTotal > 0)) return;

      for (const [c, weight] of weights) {
        // A weight under a key like "01" goes to no choice, and one too big
        // to divide counts as 0: such a vote must not break the scores
        if (c !== String(Number(c))) continue;
        const power = (weight / weightsTotal || 0) * vp;
        sums[Number(c) - 1] += type === 'quadratic' ? Math.sqrt(power) : power;
      }
      total += vp;
    }
  }

  function getScores() {
    if (type === 'ranked-choice') {
      return getRankedChoiceScores(ballots, choicesCount);
    }
    if (!isWeighted) return [...sums];

    // Shares of the voting power counted, from squared sums on quadratic voting
    const shares = sums.map(sum => (type === 'quadratic' ? sum ** 2 : sum));
    const sharesTotal = shares.reduce((sum, share) => sum + share, 0);
    return shares.map(share =>
      sharesTotal ? (share / sharesTotal) * total : 0
    );
  }

  const ticks: ScoresTick[] = [];
  votes.forEach((vote, i) => {
    addVote(vote);

    const next = votes[i + 1];
    if (next && getTimestamp(next) === getTimestamp(vote)) return;

    ticks.push({ timestamp: getTimestamp(vote), scores: getScores() });
  });

  return ticks;
}
