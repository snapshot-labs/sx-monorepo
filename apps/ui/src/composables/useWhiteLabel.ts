import { getNetwork } from '@/networks';
import defaultRoutes from '@/routes/default';
import whiteLabelRoutes from '@/routes/whiteLabel';
import { useSpacesStore } from '@/stores/spaces';
import { NetworkID } from '@/types';

const NETWORK = 's';
const DEFAULT_DOMAIN = import.meta.env.VITE_HOST || 'localhost';
const domain = window.location.hostname;

const isWhiteLabel = ref(false);
const failed = ref(false);
const resolved = ref(false);
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
  resolved.value = true;
}

async function getSpaceId(domain: string): Promise<string | null> {
  // Resolve white label domain locally if mapping is provided
  // for easier local testing
  // e.g. VITE_WHITE_LABEL_MAPPING='127.0.0.1;s:snapshot.eth'
  const localMapping = import.meta.env.VITE_WHITE_LABEL_MAPPING;
  if (localMapping) {
    const [localDomain, localSpaceId] = localMapping.split(';');
    if (domain === localDomain) return localSpaceId;
  }

  const spacesStore = useSpacesStore();
  const network = getNetwork(NETWORK);
  const space = (await network.api.loadSpaces({ limit: 1 }, { domain }))[0];

  if (!space) return null;

  spacesStore.networksMap[space.network].spaces = {
    ...spacesStore.networksMap[space.network].spaces,
    [space.id]: space
  };

  return space.id;
}

export function useWhiteLabel() {
  const router = useRouter();

  async function init() {
    if (!isWhiteLabel.value || resolved.value) return;

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
      console.log(e);
      failed.value = true;
    } finally {
      resolved.value = true;
      mountRoutes();
    }
  }

  function mountRoutes() {
    const routes = isWhiteLabel.value ? whiteLabelRoutes : defaultRoutes;

    routes.forEach(route => router.addRoute(route));
    router.replace(router.currentRoute.value.fullPath);
    router.removeRoute('splash-screen');
  }

  return {
    init,
    isWhiteLabel,
    failed,
    resolved,
    resolver: computed(() => resolver)
  };
}
