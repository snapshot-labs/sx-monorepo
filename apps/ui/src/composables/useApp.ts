import { getInstance } from '@snapshot-labs/lock/plugins/vue3';

const state = reactive({
  init: false,
  loading: false
});

const { login, initiateAuth } = useWeb3();

export function useApp() {
  async function init() {
    const auth = getInstance();
    state.loading = true;

    // Auto connect with gnosis-connector when inside gnosis-safe iframe
    if (window?.parent === window)
      auth.getConnector().then(connector => (connector ? login(connector) : initiateAuth()));
    else login('gnosis');

    state.init = true;
    state.loading = false;
  }

  return {
    init,
    app: computed(() => state)
  };
}
