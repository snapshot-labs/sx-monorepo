import { ENSChainId, getNameOwner } from '@/helpers/ens';
import { getNavConfig, NAV_ROUTE_NAMES } from '@/helpers/nav';
import { getNetwork, offchainNetworks } from '@/networks';
import { useSpaceQuery } from '@/queries/spaces';

const EXCLUDED_SUB_ROUTES = ['space-editor', 'space-proposal'];

export function useAppNav() {
  const route = useRoute();
  const notificationsStore = useNotificationsStore();
  const { isWhiteLabel } = useWhiteLabel();
  const { web3 } = useWeb3();
  const { param } = useRouteParser('space');
  const { resolved, address, networkId } = useResolve(param);
  const { data: spaceData } = useSpaceQuery({
    networkId: networkId,
    spaceId: address
  });

  const currentRouteName = computed(() => String(route.matched[0]?.name));

  const hasAppNav = computed(
    () =>
      NAV_ROUTE_NAMES.includes(currentRouteName.value) &&
      !EXCLUDED_SUB_ROUTES.includes(String(route.matched[1]?.name))
  );

  const space = computed(() => {
    if (currentRouteName.value === 'space' && resolved.value) {
      return spaceData.value ?? null;
    }

    return null;
  });

  const { isController } = useSpaceController(space);

  const ensOwner = computedAsync(
    async () => {
      if (
        !web3.value.account ||
        isController.value ||
        !space.value ||
        !offchainNetworks.includes(space.value.network)
      ) {
        return null;
      }

      const network = getNetwork(space.value.network);
      return getNameOwner(space.value.id, network.chainId as ENSChainId);
    },
    null,
    { lazy: true }
  );

  const navigationConfig = computed(() =>
    getNavConfig(currentRouteName.value, {
      route,
      space: space.value,
      networkId: networkId.value,
      address: address.value,
      isController: isController.value,
      ensOwner: ensOwner.value,
      isWhiteLabel: isWhiteLabel.value,
      web3: web3.value,
      notificationsStore
    })
  );

  return { hasAppNav, navigationConfig };
}
