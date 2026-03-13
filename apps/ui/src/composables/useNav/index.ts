import { RouteLocationNormalizedLoaded } from 'vue-router';
import { ENSChainId, getNameOwner } from '@/helpers/ens';
import { getNetwork, offchainNetworks } from '@/networks';
import myProvider from './my';
import orgProvider from './org';
import settingsProvider from './settings';
import spaceProvider from './space';
import { NavConfig, NavContext, NavItem, NavProvider } from './types';

const providers: NavProvider[] = [
  orgProvider,
  spaceProvider,
  settingsProvider,
  myProvider
];

function getActiveItemKey(
  config: NavConfig,
  route: RouteLocationNormalizedLoaded
): string | null {
  const routeName = String(route.name);
  const namespace = routeName.split('-')[0];

  for (const [key, item] of Object.entries(config.items)) {
    if (!item.activeRoute) continue;

    const { prefix, params } = item.activeRoute;
    const fullPrefix = prefix.replace(/^space-/, `${namespace}-`);

    if (routeName !== fullPrefix && !routeName.startsWith(`${fullPrefix}-`))
      continue;

    if (!params) return key;
    if (Object.entries(params).every(([k, v]) => route.params[k] === v)) {
      return key;
    }
  }

  return null;
}

function enrichItems(config: NavConfig, routeName: string): NavConfig {
  const items = Object.fromEntries(
    Object.entries(config.items)
      .map(([key, item]): [string, NavItem] => [
        key,
        {
          ...item,
          hidden: item.hidden ?? false,
          link: item.link ?? { name: `${routeName}-${key}` }
        }
      ])
      .filter(([, item]) => !item.hidden)
  );

  return { ...config, items };
}

function setup() {
  const route = useRoute();
  const notificationsStore = useNotificationsStore();
  const { isWhiteLabel } = useWhiteLabel();
  const { web3 } = useWeb3();
  const { space, spaceType } = useCurrentSpace();
  const { organization } = useOrganization();

  const currentRouteName = computed(() => String(route.matched[0]?.name));

  const currentProvider = computed(() =>
    providers.find(p => p.routeName === currentRouteName.value)
  );

  const spaceOnRoute = computed(() =>
    currentRouteName.value === 'space' ? space.value : null
  );

  const { isController } = useSpaceController(spaceOnRoute);

  const ensOwner = computedAsync(
    async () => {
      if (
        !web3.value.account ||
        isController.value ||
        !spaceOnRoute.value ||
        !offchainNetworks.includes(spaceOnRoute.value.network)
      ) {
        return null;
      }

      const network = getNetwork(spaceOnRoute.value.network);
      return getNameOwner(spaceOnRoute.value.id, network.chainId as ENSChainId);
    },
    null,
    { lazy: true }
  );

  const context = computed<NavContext>(() => ({
    route,
    account: web3.value.account,
    unreadCount: notificationsStore.unreadNotificationsCount,
    isWhiteLabel: isWhiteLabel.value,
    space: spaceOnRoute.value,
    spaceType: spaceType.value,
    isController: isController.value,
    ensOwner: ensOwner.value,
    organization: organization.value
  }));

  const hasAppNav = computed<boolean>(() => {
    const provider = currentProvider.value;
    if (!provider) return false;
    return provider.isVisible?.(context.value) ?? true;
  });

  const config = computed<NavConfig | null>(() => {
    const provider = currentProvider.value;
    if (!provider) return null;

    const result = provider.getConfig(context.value);
    if (!result) return null;

    return enrichItems(result, provider.routeName);
  });

  const activeItemKey = computed(() =>
    config.value ? getActiveItemKey(config.value, route) : null
  );

  return { hasAppNav, config, activeItemKey };
}

export const useNav = createSharedComposable(setup);
