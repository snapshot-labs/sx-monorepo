import { APP_NAME } from '@/helpers/constants';

const state = reactive({
  init: false,
  loading: false,
  app_name: APP_NAME
});

const { autoLogin } = useWeb3();

export function useApp() {
  async function init() {
    state.loading = true;

    // Auto connect with gnosis-connector when inside gnosis-safe iframe
    autoLogin(window?.parent === window ? undefined : 'gnosis');

    state.init = true;
    state.loading = false;
  }

  function setAppName(title: string | null) {
    state.app_name = title ?? window.location.toString();
  }

  return {
    init,
    setAppName,
    app: computed(() => state)
  };
}
