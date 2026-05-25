(globalThis as { window?: unknown }).window ??= undefined;

import { readFileSync } from 'node:fs';
import { clients, offchainMainnet } from '@snapshot-labs/sx';
import { getProposalSnapshotBlock, gql } from '../hub.js';
import { getSigner } from '../signer.js';

const sx = new clients.OffchainEthereumSig({ networkConfig: offchainMainnet });
const DEFAULT_PERIOD = 60 * 60 * 24 * 3;

type SpaceInfo = {
  id: string;
  network: string;
  voting: {
    delay: number | null;
    period: number | null;
    type: string | null;
    privacy: string | null;
  };
};

function readBody(opts: { body?: string; bodyFile?: string }): string {
  if (opts.bodyFile !== undefined) return readFileSync(opts.bodyFile, 'utf8');
  return opts.body ?? '';
}

export async function propose(
  spaceId: string,
  title: string,
  opts: {
    body?: string;
    bodyFile?: string;
    choices?: string;
    type?: string;
    discussion?: string;
  }
): Promise<void> {
  const { signer, user } = await getSigner();
  const { space } = await gql<{ space: SpaceInfo | null }>(
    'query ($id: String!) { space(id: $id) { id network voting { delay period type privacy } } }',
    { id: spaceId }
  );
  if (space === null) throw new Error(`Space not found: ${spaceId}`);

  const type = opts.type ?? space.voting.type ?? 'basic';
  const choices = opts.choices
    ? opts.choices.split(',').map(s => s.trim())
    : type === 'basic'
      ? ['For', 'Against', 'Abstain']
      : [];
  if (choices.length < 2) {
    throw new Error(`--choices is required for voting type "${type}"`);
  }

  const chainId = Number(space.network);
  if (!Number.isFinite(chainId)) {
    throw new Error(`Space "${space.id}" has unsupported network "${space.network}"`);
  }

  const now = Math.floor(Date.now() / 1000);
  const start = now + (space.voting.delay ?? 0);
  const period = space.voting.period ?? DEFAULT_PERIOD;
  const end = start + (period > 0 ? period : DEFAULT_PERIOD);

  const envelope = await sx.propose({
    signer,
    data: {
      space: space.id,
      type,
      title,
      body: readBody(opts),
      discussion: opts.discussion ?? '',
      choices,
      privacy: space.voting.privacy === 'shutter' ? 'shutter' : '',
      labels: [],
      start,
      end,
      snapshot: await getProposalSnapshotBlock(chainId),
      plugins: '{}',
      app: 'snapshot-cli',
      from: user
    } as Parameters<typeof sx.propose>[0]['data']
  });
  const result = (await sx.send(envelope)) as unknown;
  console.log(JSON.stringify(result, null, 2));
}
