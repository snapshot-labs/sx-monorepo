import { getNetwork, metadataNetwork } from '@/networks';
import { useSpacesStore } from '@/stores/spaces';
import { Space } from '@/types';

const DEFAULT_DOMAIN = import.meta.env.VITE_HOST || 'localhost';
const domain = window.location.hostname;

const isWhiteLabel = ref(false);
const isCustomDomain = ref(domain !== DEFAULT_DOMAIN);
const failed = ref(false);
const resolved = ref(domain === DEFAULT_DOMAIN);
const space = ref<Space | null>(null);

async function getSpace(domain: string): Promise<Space | null> {
  const loadSpacesParams: Record<string, string> = {};

  // Resolve white label domain locally if mapping is provided
  // for easier local testing
  // e.g. VITE_WHITE_LABEL_MAPPING='127.0.0.1;snapshot.eth'
  const localMapping = import.meta.env.VITE_WHITE_LABEL_MAPPING;
  if (localMapping) {
    const [localDomain, localSpaceId] = localMapping.split(';');
    if (domain === localDomain) {
      loadSpacesParams.id = localSpaceId;
    }
  } else {
    loadSpacesParams.domain = domain;
  }

  const spacesStore = useSpacesStore();
  const network = getNetwork(metadataNetwork);
  const space = (
    await network.api.loadSpaces({ limit: 1 }, loadSpacesParams)
  )[0];

  if (!space) return null;

  spacesStore.networksMap[space.network].spaces = {
    ...spacesStore.networksMap[space.network].spaces,
    [space.id]: space
  };

  return space;
}

export function useWhiteLabel() {
  async function init() {
    if (resolved.value) return;

    try {
      space.value = await getSpace(domain);

      if (space.value) {
        isWhiteLabel.value = true;
      }
    } catch (e) {
      console.log(e);
      failed.value = true;
    } finally {
      resolved.value = true;
    }
  }

  return {
    init,
    isWhiteLabel,
    isCustomDomain,
    failed,
    space,
    resolved
  };
}
