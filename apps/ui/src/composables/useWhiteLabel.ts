import { NetworkID, Space } from '@/types';

const SIDEKICK_URL = 'https://sh5.co';
const DEFAULT_DOMAIN = import.meta.env.VITE_HOST || 'localhost';
const domain = window.location.hostname;

const isWhiteLabel = ref(false);
const space = ref<Space | null>(null);

if (domain !== DEFAULT_DOMAIN) {
  isWhiteLabel.value = true;
}

export function useWhiteLabel() {
  async function getSpaceId(domain: string): Promise<string | null> {
    const result = await fetch(`${SIDEKICK_URL}/api/domains/${domain}`, {
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await result.json();

    // TODO Remove hardcoded returned space ID once sidekick is returning correct space ID
    return data?.space_id ?? 's:safe.eth';
  }

  async function init() {
    if (!isWhiteLabel.value) return;

    try {
      const spacesStore = useSpacesStore();
      const id = await getSpaceId(domain);

      if (!id) throw new Error('Invalid white label domain');

      const [networkId, spaceId] = id.split(':') as [NetworkID, string];

      await spacesStore.fetchSpace(spaceId, networkId);
      space.value = spacesStore.networksMap[networkId].spaces[spaceId];

      return true;
    } catch (e) {
      isWhiteLabel.value = false;
    }
  }

  return {
    init,
    isWhiteLabel,
    space
  };
}
