import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { Space } from '@/types';

const DEFAULT_DOMAIN = import.meta.env.VITE_HOST || 'localhost';
const domain = window.location.hostname;

const state: {
  init: boolean;
  loading: boolean;
  isWhiteLabel: boolean;
  domain: null | string;
  space: Space | null;
} = reactive({
  init: false,
  loading: false,
  isWhiteLabel: false,
  space: null,
  domain: null
});

const { login } = useWeb3();

if (domain !== DEFAULT_DOMAIN) {
  state.isWhiteLabel = true;
  state.domain = domain;
}

export function useApp() {
  async function init() {
    const auth = getInstance();
    state.loading = true;

    if (state.isWhiteLabel) {
      const spacesStore = useSpacesStore();

      // TODO Remove this hardcoded test domain once domain is handled by space settings
      const spaceId = 'test.wa0x6e.eth';
      await spacesStore.fetchSpace(spaceId, 's');
      state.space = spacesStore.networksMap['s'].spaces[spaceId];
    }

    // Auto connect with gnosis-connector when inside gnosis-safe iframe
    if (window?.parent === window)
      auth.getConnector().then(connector => login(connector));
    else login('gnosis');

    state.init = true;
    state.loading = false;
  }

  return {
    init,
    app: computed(() => state)
  };
}
