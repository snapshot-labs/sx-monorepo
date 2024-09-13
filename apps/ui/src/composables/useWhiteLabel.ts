import { NetworkID } from '@/types';

const SIDEKICK_URL = import.meta.env.VITE_SIDEKICK_URL || 'https://sh5.co';
const DEFAULT_DOMAIN = import.meta.env.VITE_HOST || 'localhost';
const domain = window.location.hostname;

const isWhiteLabel = ref(false);
const failed = ref(false);
const loaded = ref(false);
const resolver = reactive<{
  address: string | null;
  networkId: NetworkID | null;
}>({
  address: null,
  networkId: null
});

if (domain !== DEFAULT_DOMAIN) {
  isWhiteLabel.value = true;
} else {
  loaded.value = true;
}

async function getSpaceId(domain: string): Promise<string | null> {
  // Resolve white label domain locally if mapping is provided
  // e.g. VITE_WHITE_LABEL_MAPPING='127.0.0.1;s:snapshot.eth'
  const localMapping = import.meta.env.VITE_WHITE_LABEL_MAPPING;
  if (localMapping) {
    const [localDomain, localSpaceId] = localMapping.split(';');
    if (domain === localDomain) return localSpaceId;
  }

  const result = await fetch(`${SIDEKICK_URL}/api/domains/${domain}`, {
    headers: { 'Content-Type': 'application/json' }
  });
  const data: { domain: string; space_id: string } = await result.json();

  // Checking that the returned json is valid
  if (!('domain' in data)) throw new Error('Invalid response');

  return data.space_id ?? null;
}

export function useWhiteLabel() {
  async function init() {
    if (!isWhiteLabel.value || loaded.value) return;

    try {
      const id = await getSpaceId(domain);

      if (!id) {
        isWhiteLabel.value = false;
        return;
      }

      const [networkId, spaceId] = id.split(':') as [NetworkID, string];
      resolver.address = spaceId;
      resolver.networkId = networkId;
    } catch (e) {
      failed.value = true;
    } finally {
      loaded.value = true;
    }
  }

  return {
    init,
    isWhiteLabel,
    failed,
    loaded,
    resolver: computed(() => resolver)
  };
}
