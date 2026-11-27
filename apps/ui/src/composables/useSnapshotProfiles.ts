import { normalizeAddress } from '@/helpers/stakedVoteDelegation';

/**
 * Snapshot user profiles (name, about, avatar, socials) for many addresses,
 * loaded in batches from the hub. Validators publish theirs with the regular
 * "Edit profile" dialog, signed by their staker wallet.
 */
export type SnapshotProfile = {
  id: string;
  name: string | null;
  about: string | null;
  avatar: string | null;
  twitter: string | null;
  github: string | null;
};

const HUB_URL = 'https://hub.snapshot.org/graphql';
/** The hub rejects `id_in` lists that are too long. */
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 30;

const profiles = reactive(new Map<string, SnapshotProfile | null>());
const queued = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  timer = null;
  const ids = [...queued];
  queued.clear();
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(HUB_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: `query ($ids: [String]) {
            users(first: 1000, where: { id_in: $ids }) {
              id name about avatar twitter github
            }
          }`,
          variables: { ids: batch }
        })
      });
      const body = await res.json();
      const found = new Map<string, SnapshotProfile>(
        (body.data?.users ?? []).map((user: SnapshotProfile) => [
          user.id.toLowerCase(),
          user
        ])
      );
      for (const id of batch) profiles.set(id, found.get(id) ?? null);
    } catch (err) {
      console.warn('failed to load Snapshot profiles', err);
      for (const id of batch) profiles.set(id, null);
    }
  }
}

function keyOf(address: string) {
  try {
    return normalizeAddress(address).toLowerCase();
  } catch {
    return null;
  }
}

export function useSnapshotProfiles() {
  /** Queues `address` for loading; calls made together share one request. */
  function request(address: string) {
    const key = keyOf(address);
    if (!key || profiles.has(key) || queued.has(key)) return;
    queued.add(key);
    timer ??= setTimeout(flush, BATCH_DELAY_MS);
  }

  function getProfile(address: string): SnapshotProfile | null {
    const key = keyOf(address);
    return key ? profiles.get(key) ?? null : null;
  }

  /** Reloads one address, e.g. after its owner edited the profile. */
  function refresh(address: string) {
    const key = keyOf(address);
    if (!key) return;
    profiles.delete(key);
    request(address);
  }

  return { request, getProfile, refresh };
}
