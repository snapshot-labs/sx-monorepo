import {
  DEPRECATED_STRATEGIES,
  OVERRIDING_STRATEGIES
} from '@/helpers/constants';
import { offchainNetworks } from '@/networks';
import { Space } from '@/types';

const UPCOMING_PRO_ONLY_NETWORKS: readonly string[] = [
  '137' // Polygon
];

type AlertType =
  | 'HAS_DEPRECATED_STRATEGIES'
  | 'HAS_PRO_ONLY_STRATEGIES'
  | 'HAS_PRO_ONLY_NETWORKS'
  | 'HAS_PRO_ONLY_WHITELABEL';

export function useSpaceAlerts(
  space: Ref<Space>,
  options: { isEditor: boolean } = {
    isEditor: false
  }
) {
  const {
    networks,
    premiumChainIds,
    loaded: networksLoaded
  } = useOffchainNetworksList(space.value.network);

  const isOffchainSpace = computed(() =>
    offchainNetworks.includes(space.value.network)
  );

  const unsupportedProOnlyStrategies = computed(() => {
    if (!isOffchainSpace.value) return [];

    return space.value.strategies.filter(
      strategy =>
        (OVERRIDING_STRATEGIES as readonly string[]).includes(strategy) &&
        !space.value.turbo
    );
  });

  const deprecatedStrategies = computed(() => {
    if (!isOffchainSpace.value) return [];

    return space.value.strategies.filter(strategy =>
      (DEPRECATED_STRATEGIES as readonly string[]).includes(strategy)
    );
  });

  const unsupportedProOnlyNetworks = computed(() => {
    if (
      !isOffchainSpace.value ||
      !space.value.snapshot_chain_id ||
      !networksLoaded.value ||
      space.value.turbo
    )
      return [];

    const ids = new Set<string>([
      space.value.snapshot_chain_id,
      ...space.value.strategies_params.map(strategy =>
        String(strategy.network)
      ),
      ...space.value.strategies_params.flatMap(strategy =>
        Array.isArray(strategy.params?.strategies)
          ? strategy.params.strategies.map(param => String(param.network))
          : []
      )
    ]);

    const isNetworkUpcomingPro = (networkId: string) =>
      UPCOMING_PRO_ONLY_NETWORKS.includes(networkId) && !options.isEditor;

    return Array.from(ids)
      .filter(n => !premiumChainIds.value.has(n) || isNetworkUpcomingPro(n))
      .map(chainId => networks.value.find(n => String(n.chainId) === chainId))
      .filter(network => !!network);
  });

  const alerts = computed(() => {
    const alertsMap = new Map<AlertType, Record<string, any>>();

    if (deprecatedStrategies.value.length) {
      alertsMap.set('HAS_DEPRECATED_STRATEGIES', {
        strategies: deprecatedStrategies.value
      });
    }

    if (unsupportedProOnlyStrategies.value.length) {
      alertsMap.set('HAS_PRO_ONLY_STRATEGIES', {
        strategies: unsupportedProOnlyStrategies.value
      });
    }

    if (unsupportedProOnlyNetworks.value.length) {
      alertsMap.set('HAS_PRO_ONLY_NETWORKS', {
        networks: unsupportedProOnlyNetworks.value
      });
    }

    if (space.value.additionalRawData?.domain && !space.value.turbo) {
      alertsMap.set('HAS_PRO_ONLY_WHITELABEL', {
        domain: space.value.additionalRawData.domain
      });
    }

    return alertsMap;
  });

  return {
    alerts
  };
}
