import { FunctionalComponent } from 'vue';
import { RouteLocationNormalizedLoaded, RouteLocationRaw } from 'vue-router';
import { ENSChainId, getNameOwner } from '@/helpers/ens';
import { getNetwork, offchainNetworks } from '@/networks';
import { useSpaceQuery } from '@/queries/spaces';
import { NetworkID, Space } from '@/types';
import my from './my';
import settings from './settings';
import space from './space';

export type NavigationItem = {
  name: string;
  icon?: FunctionalComponent;
  count?: number;
  hidden?: boolean;
  link?: RouteLocationRaw;
  active?: boolean;
};

export type NavigationConfig = {
  style?: 'default' | 'slim';
  items: Record<string, NavigationItem>;
};

export type NavContext = {
  route: RouteLocationNormalizedLoaded;
  account: string;
  unreadCount: number;
  isWhiteLabel: boolean;
  space: Space | null;
  networkId: NetworkID | null;
  address: string | null;
  isController: boolean;
  ensOwner: string | null;
};

export type NavProvider = {
  routeName: string;
  getConfig: (context: NavContext) => NavigationConfig;
};

const providers: NavProvider[] = [space, settings, my];

export const NAV_ROUTE_NAMES = providers.map(p => p.routeName);

const EXCLUDED_SUB_ROUTES = ['space-editor', 'space-proposal'];

function enrichNavigationItems(
  config: NavigationConfig,
  routeName: string,
  route: Pick<RouteLocationNormalizedLoaded, 'name'>
): NavigationConfig {
  const items = Object.fromEntries(
    Object.entries(config.items)
      .map(([key, item]): [string, NavigationItem] => [
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

export function useNavigation() {
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

  const navigationConfig = computed(() => {
    const name = currentRouteName.value;
    const provider = providers.find(p => p.routeName === name);
    if (!provider) return null;

    const config = provider.getConfig({
      route,
      account: web3.value.account,
      unreadCount: notificationsStore.unreadNotificationsCount,
      isWhiteLabel: isWhiteLabel.value,
      space: space.value,
      networkId: networkId.value,
      address: address.value,
      isController: isController.value,
      ensOwner: ensOwner.value
    });

    return enrichNavigationItems(config, name, route);
  });

  return { hasAppNav, navigationConfig };
}
