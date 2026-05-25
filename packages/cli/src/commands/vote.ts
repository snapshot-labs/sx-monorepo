(globalThis as { window?: unknown }).window ??= undefined;

import { init as shutterInit } from '@shutter-network/shutter-crypto';
import { clients, offchainMainnet } from '@snapshot-labs/sx';
import { gql } from '../hub.js';
import { getSigner } from '../signer.js';

const sx = new clients.OffchainEthereumSig({ networkConfig: offchainMainnet });

function parseChoice(input: string): number | number[] | Record<string, number> {
  const trimmed = input.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return JSON.parse(trimmed) as number[] | Record<string, number>;
  }
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Invalid choice "${input}". Expected a 1-based index, JSON array, or JSON object.`);
  }
  return n;
}

export async function vote(
  proposalId: string,
  rawChoice: string,
  opts: { reason?: string }
): Promise<void> {
  const { signer, user } = await getSigner();
  const { proposal } = await gql<{
    proposal: { id: string; space: { id: string }; type: string; privacy: string } | null;
  }>(
    'query ($id: String!) { proposal(id: $id) { id space { id } type privacy } }',
    { id: proposalId }
  );
  if (proposal === null) throw new Error(`Proposal not found: ${proposalId}`);

  const privacy = proposal.privacy === 'shutter' ? 'shutter' : 'none';
  if (privacy === 'shutter') await shutterInit();

  const envelope = await sx.vote({
    signer,
    data: {
      space: proposal.space.id,
      proposal: proposal.id,
      choice: parseChoice(rawChoice),
      reason: privacy === 'shutter' ? '' : (opts.reason ?? ''),
      from: user,
      type: proposal.type,
      privacy,
      app: 'snapshot-cli',
      authenticator: '',
      strategies: [],
      metadataUri: ''
    }
  });
  const result = (await sx.send(envelope)) as unknown;
  console.log(JSON.stringify(result, null, 2));
}
