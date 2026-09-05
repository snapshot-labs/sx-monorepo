import { readFile, writeFile } from 'node:fs/promises';

// Paste your key from https://openrouter.ai/keys (falls back to the env var).
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
const MODEL = process.env.OPENROUTER_MODEL ?? 'anthropic/claude-opus-5';

// Opus 5 thinks by default. Low effort is plenty for this call and keeps the
// bill down, raise it if predictions look shallow.
const REASONING_EFFORT = 'low';
// Voters judged in parallel. Each voter still gets their own request.
const CONCURRENCY = 4;
// 0 runs every voter. Set a small number for a cheap test run first.
const MAX_VOTERS = 0;
// Most recent votes shown per voter, and body characters per proposal.
const HISTORY_LIMIT = 40;
const BODY_LIMIT = 4000;
const MAX_RETRIES = 4;

const INPUT_FILE = process.env.INPUT_FILE ?? 'scripts/autovote.json';
const OUTPUT_FILE = process.env.OUTPUT_FILE ?? 'scripts/autovote-predict.json';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

type Proposal = {
  id: string;
  title: string;
  body: string;
  type: string;
  choices: string[];
  created: number;
  quorum: number;
  scores: number[];
  scores_total: number;
};

type Vote = {
  created: number;
  choice: unknown;
  vp: number;
  reason: string;
  proposal: string;
};

type Voter = {
  address: string;
  vp: number;
  profile: { name: string | null; about: string | null } | null;
  statement: { about: string; statement: string } | null;
  votes: Vote[];
};

type Dataset = {
  space: string;
  proposal: Proposal;
  proposals: Proposal[];
  voters: Voter[];
};

type Prediction = {
  choice: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
};

type Result = Prediction & { address: string; vp: number; label: string };

// OpenRouter reports what it charged per request, so the fee is measured
// rather than estimated from token counts.
type Usage = {
  prompt_tokens: number;
  completion_tokens: number;
  cost?: number;
};

const SYSTEM_PROMPT = `You predict how one specific Snapshot voter would vote on a new proposal, using only their own voting history in this space plus their public profile.

Rules:
- Pick exactly one of the numbered options. "choice" is that option's 1-based index, which is how Snapshot encodes a vote.
- Reason from evidence: how they voted on comparable past proposals, positions they state publicly, and any consistent pattern in their behaviour.
- Use confidence "low" when the history is thin or says nothing about this topic. Do not manufacture a rationale you cannot point to.
- Keep "reasoning" to one or two sentences naming the specific past votes or statement text behind the prediction.`;

const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'vote_prediction',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        choice: {
          type: 'integer',
          description: '1-based index of the chosen option'
        },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        reasoning: { type: 'string' }
      },
      required: ['choice', 'confidence', 'reasoning'],
      additionalProperties: false
    }
  }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const day = (timestamp: number) =>
  new Date(timestamp * 1000).toISOString().slice(0, 10);

const round = (value: number) => Math.round(value).toLocaleString('en-US');

// Runs handler over every item, keeping at most CONCURRENCY requests in flight.
async function pool<T, R>(
  items: T[],
  handler: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await handler(items[index] as T, index);
      }
    })
  );

  return results;
}

// A vote's choice is an index, a list of indexes, or index-to-weight, depending
// on the proposal type. Render each as the option labels behind it, keeping the
// distinction between a ranking and an unordered set of approvals.
function formatChoice(vote: Vote, proposal: Proposal): string {
  const { choice } = vote;
  const label = (index: number) => proposal.choices[index - 1] ?? `#${index}`;

  if (typeof choice === 'number') return label(choice);
  if (Array.isArray(choice)) {
    const labels = choice.map(c => label(Number(c)));
    return proposal.type === 'ranked-choice'
      ? labels.join(' > ')
      : `approved ${labels.join(', ')}`;
  }
  if (choice && typeof choice === 'object') {
    return Object.entries(choice as Record<string, number>)
      .map(([index, weight]) => `${label(Number(index))}: ${weight}`)
      .join(', ');
  }

  return 'undisclosed';
}

function formatProposal(proposal: Proposal): string {
  const options = proposal.choices
    .map((choice, index) => `${index + 1}. ${choice}`)
    .join('\n');

  return [
    `Title: ${proposal.title}`,
    `Voting type: ${proposal.type}`,
    `Options:\n${options}`,
    `Body:\n${proposal.body.slice(0, BODY_LIMIT)}`
  ].join('\n\n');
}

function formatVoter(
  voter: Voter,
  proposals: Record<string, Proposal>
): string {
  const history = [...voter.votes]
    .sort((a, b) => b.created - a.created)
    .slice(0, HISTORY_LIMIT)
    .flatMap(vote => {
      const proposal = proposals[vote.proposal];
      if (!proposal) return [];

      const reason = vote.reason.trim();
      return [
        `- ${day(vote.created)} "${proposal.title}" voted ${formatChoice(vote, proposal)}` +
          ` (voting power ${round(vote.vp)})${reason ? ` reason: ${reason}` : ''}`
      ];
    });

  const identity = [
    voter.profile?.name && `Name: ${voter.profile.name}`,
    voter.profile?.about && `About: ${voter.profile.about}`,
    voter.statement?.statement &&
      `Delegate statement: ${voter.statement.statement}`
  ].filter(Boolean);

  return [
    `Address: ${voter.address}`,
    `Voting power on this proposal: ${round(voter.vp)}`,
    ...identity,
    `Voting history in this space (${voter.votes.length} votes, most recent first):`,
    history.length ? history.join('\n') : '- none'
  ].join('\n');
}

async function predict(
  voter: Voter,
  dataset: Dataset,
  proposals: Record<string, Proposal>,
  apiKey: string,
  attempt = 0
): Promise<{ prediction: Prediction; usage: Usage }> {
  const retry = async (delay: number) => {
    if (attempt >= MAX_RETRIES) return null;
    await sleep(delay * 1000);
    return predict(voter, dataset, proposals, apiKey, attempt + 1);
  };

  let res: Response;

  try {
    res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        reasoning: { effort: REASONING_EFFORT },
        response_format: RESPONSE_FORMAT,
        provider: { require_parameters: true },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              `Space: ${dataset.space}`,
              `\n## Proposal being voted on\n\n${formatProposal(dataset.proposal)}`,
              `\n## The voter\n\n${formatVoter(voter, proposals)}`,
              `\nHow does this voter vote?`
            ].join('\n')
          }
        ]
      })
    });
  } catch (err) {
    const retried = await retry(2 ** attempt);
    if (retried) return retried;
    throw err;
  }

  if (res.status === 429 || res.status >= 500) {
    const retryAfter = Number(res.headers.get('retry-after')) || 2 ** attempt;
    const retried = await retry(retryAfter);
    if (retried) return retried;
    throw new Error(
      `OpenRouter answered ${res.status}, gave up after ${attempt}`
    );
  }

  const json = (await res.json()) as {
    choices?: { message: { content: string } }[];
    usage?: Usage;
    error?: { message: string };
  };

  const content = json.choices?.[0]?.message.content;
  if (!content) {
    throw new Error(json.error?.message ?? `OpenRouter returned no choice`);
  }

  const usage = json.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
  const prediction = JSON.parse(content) as Prediction;

  // strict json_schema cannot express a numeric range, so check it here.
  if (!dataset.proposal.choices[prediction.choice - 1]) {
    const retried = await retry(1);
    if (retried) return retried;
    throw new Error(`Model returned out of range choice ${prediction.choice}`);
  }

  return { prediction, usage };
}

async function run() {
  const apiKey = OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'No OpenRouter key. Set OPENROUTER_API_KEY at the top of this file.'
    );
  }

  const dataset = JSON.parse(await readFile(INPUT_FILE, 'utf8')) as Dataset;
  const proposals = Object.fromEntries(
    dataset.proposals.map(proposal => [proposal.id, proposal])
  );
  const voters = MAX_VOTERS
    ? dataset.voters.slice(0, MAX_VOTERS)
    : dataset.voters;

  console.log(`Proposal: ${dataset.proposal.title}`);
  console.log(`Options: ${dataset.proposal.choices.join(' | ')}`);
  console.log(`Predicting ${voters.length} voters with ${MODEL}\n`);

  const totals = { cost: 0, input: 0, output: 0, failed: 0 };

  const results = await pool(voters, async (voter, index) => {
    const position = `[${index + 1}/${voters.length}]`;

    try {
      const { prediction, usage } = await predict(
        voter,
        dataset,
        proposals,
        apiKey
      );

      totals.cost += usage.cost ?? 0;
      totals.input += usage.prompt_tokens;
      totals.output += usage.completion_tokens;

      const label = dataset.proposal.choices[prediction.choice - 1] as string;
      console.log(
        `${position} ${voter.address} ${label} (${prediction.confidence})`
      );

      return { ...prediction, address: voter.address, vp: voter.vp, label };
    } catch (err) {
      totals.failed++;
      console.log(`${position} ${voter.address} failed: ${err}`);
      return null;
    }
  });

  const predictions = results.filter((result): result is Result => !!result);

  await writeFile(
    OUTPUT_FILE,
    JSON.stringify(
      {
        space: dataset.space,
        proposal: dataset.proposal.id,
        model: MODEL,
        fee: totals.cost,
        predictions
      },
      null,
      2
    )
  );

  console.log(`\nResult by choice (voters / voting power):`);
  dataset.proposal.choices.forEach((choice, index) => {
    const picked = predictions.filter(p => p.choice === index + 1);
    const power = picked.reduce((total, p) => total + p.vp, 0);
    console.log(`  ${choice}: ${picked.length} / ${round(power)}`);
  });

  const byConfidence = (level: string) =>
    predictions.filter(p => p.confidence === level).length;
  console.log(
    `\nConfidence: ${byConfidence('high')} high, ${byConfidence('medium')} medium, ${byConfidence('low')} low`
  );
  console.log(`Predicted: ${predictions.length}/${voters.length}`);
  if (totals.failed) console.log(`Failed: ${totals.failed}`);
  console.log(`Tokens: ${round(totals.input)} in, ${round(totals.output)} out`);
  console.log(`Fee paid: $${totals.cost.toFixed(4)}`);
  console.log(`Saved to ${OUTPUT_FILE}`);

  return { predictions, fee: totals.cost };
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
