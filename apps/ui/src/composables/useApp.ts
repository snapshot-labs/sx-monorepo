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

    let connectorId: string | undefined = undefined;

    // Auto connect with unicorn-connector when walletId param is in URL
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('walletId')) connectorId = 'unicorn';
    else if (searchParams.get('connectAs')) connectorId = 'spectator';
    // Auto connect with gnosis-connector when inside gnosis-safe iframe
    if (window?.parent !== window) connectorId = 'gnosis';

    autoLogin(connectorId);

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
