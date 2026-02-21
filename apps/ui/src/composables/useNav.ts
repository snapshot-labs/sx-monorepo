import { RouteLocationNormalizedLoaded } from 'vue-router';
import { ENSChainId, getNameOwner } from '@/helpers/ens';
import { getNetwork, offchainNetworks } from '@/networks';
import { NetworkID } from '@/types';
import my from './useNav/my';
import settings from './useNav/settings';
import space from './useNav/space';
import { NavConfig, NavItem, NavProvider } from './useNav/types';

const providers: NavProvider[] = [space, settings, my];

function enrichItems(
  config: NavConfig,
  routeName: string,
  route: Pick<RouteLocationNormalizedLoaded, 'name'>
): NavConfig {
  const items = Object.fromEntries(
    Object.entries(config.items)
      .map(([key, item]): [string, NavItem] => [
        key,
        {
          ...item,
          active: item.active ?? route.name === `${routeName}-${key}`,
          hidden: item.hidden ?? false,
          link: item.link ?? { name: `${routeName}-${key}` }
        }
      ])
      .filter(([, item]) => !item.hidden)
  );

  return { ...config, items };
}

export function useNav() {
  const route = useRoute();
  const notificationsStore = useNotificationsStore();
  const { isWhiteLabel } = useWhiteLabel();
  const { web3 } = useWeb3();
  const { space: currentSpace, networkId, address } = useCurrentSpace();

  const currentRouteName = computed(() => String(route.matched[0]?.name));

  const currentProvider = computed(() =>
    providers.find(p => p.routeName === currentRouteName.value)
  );

  const space = computed(() =>
    currentRouteName.value === 'space' ? currentSpace.value : null
  );

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

  const context = computed(() => ({
    route,
    account: web3.value.account,
    unreadCount: notificationsStore.unreadNotificationsCount,
    isWhiteLabel: isWhiteLabel.value,
    space: space.value,
    networkId: networkId.value as NetworkID | null,
    address: address.value,
    isController: isController.value,
    ensOwner: ensOwner.value
  }));

  const hasAppNav = computed(() => {
    const provider = currentProvider.value;
    if (!provider) return false;
    return provider.isVisible?.(context.value) ?? true;
  });

  const config = computed(() => {
    const provider = currentProvider.value;
    if (!provider) return null;

    const result = provider.getConfig(context.value);
    return enrichItems(result, provider.routeName, route);
  });

  return { hasAppNav, config };
}
