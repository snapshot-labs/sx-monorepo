import { NetworkID, Space } from '@/types';

const SIDEKICK_URL = import.meta.env.VITE_SIDEKICK_URL || 'https://sh5.co';
const DEFAULT_DOMAIN = import.meta.env.VITE_HOST || 'localhost';
const domain = window.location.hostname;

const isWhiteLabel = ref(false);
const space = ref<Space | null>(null);
const failed = ref(false);

if (domain !== DEFAULT_DOMAIN) {
  isWhiteLabel.value = true;
}

export function useWhiteLabel() {
  async function getSpaceId(domain: string): Promise<string | null> {
    const result = await fetch(`${SIDEKICK_URL}/api/domains/${domain}`, {
      headers: { 'Content-Type': 'application/json' }
    });
    const data: { domain: string; space_id: string } = await result.json();

    // Checking that the returned json is valid
    if (!(domain in data)) throw new Error('Invalid response');

    return data.space_id ?? null;
  }

  async function init() {
    if (!isWhiteLabel.value) return;

    try {
      const spacesStore = useSpacesStore();
      const id = await getSpaceId(domain);

      if (!id) {
        isWhiteLabel.value = false;
        return;
      }

      const [networkId, spaceId] = id.split(':') as [NetworkID, string];

      await spacesStore.fetchSpace(spaceId, networkId);
      space.value = spacesStore.networksMap[networkId].spaces[spaceId];
    } catch (e) {
      failed.value = true;
    }
  }

  return {
    init,
    isWhiteLabel,
    space,
    failed
  };
}
