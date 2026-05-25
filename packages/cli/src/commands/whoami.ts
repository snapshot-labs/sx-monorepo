import { gql } from '../hub.js';
import { getSigner } from '../signer.js';
import { lookupAddress } from '../stamp.js';

export async function whoami(): Promise<void> {
  const { user } = await getSigner();
  const [{ user: profile }, ens] = await Promise.all([
    gql<{ user: Record<string, string | null> | null }>(
      'query ($id: String!) { user(id: $id) { name about avatar github twitter lens farcaster } }',
      { id: user }
    ),
    lookupAddress(user)
  ]);
  console.log(JSON.stringify({ address: user, ens, profile }, null, 2));
}
