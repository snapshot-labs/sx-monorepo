// Stub `window` so SX's shutter guard is falsy in Node.
(globalThis as { window?: unknown }).window ??= undefined;

import { clients, offchainMainnet } from '@snapshot-labs/sx';
import { gql } from '../hub.js';
import { getSigner } from '../signer.js';

const sx = new clients.OffchainEthereumSig({ networkConfig: offchainMainnet });

async function requireSpaceId(id: string): Promise<string> {
  const { space } = await gql<{ space: { id: string } | null }>(
    'query ($id: String!) { space(id: $id) { id } }',
    { id }
  );
  if (space === null) throw new Error(`Space not found: ${id}`);
  return space.id;
}

export async function follow(spaceId: string): Promise<void> {
  const { signer, user } = await getSigner();
  const id = await requireSpaceId(spaceId);
  const envelope = await sx.followSpace({
    signer,
    data: { from: user, space: id, network: 's' }
  });
  const result = (await sx.send(envelope)) as unknown;
  console.log(JSON.stringify(result, null, 2));
}

export async function unfollow(spaceId: string): Promise<void> {
  const { signer, user } = await getSigner();
  const id = await requireSpaceId(spaceId);
  const envelope = await sx.unfollowSpace({
    signer,
    data: { from: user, space: id, network: 's' }
  });
  const result = (await sx.send(envelope)) as unknown;
  console.log(JSON.stringify(result, null, 2));
}
