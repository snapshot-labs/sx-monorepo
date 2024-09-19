import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { APP_NAME } from '@/helpers/constants';

const state = reactive({
  init: false,
  loading: false,
  app_name: APP_NAME
});

const { login } = useWeb3();

export function useApp() {
  async function init() {
    const auth = getInstance();
    state.loading = true;

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
