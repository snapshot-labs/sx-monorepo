import { getInstance } from '@snapshot-labs/lock/plugins/vue3';

const state = reactive({
  init: false,
  loading: false
});

const { login } = useWeb3();
const { isWhiteLabel, init: initWhiteLabel } = useWhiteLabel();

export function useApp() {
  async function init() {
    const auth = getInstance();
    state.loading = true;

    if (isWhiteLabel.value) {
      await initWhiteLabel();
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
