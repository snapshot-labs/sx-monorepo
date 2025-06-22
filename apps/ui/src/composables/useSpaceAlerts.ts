import {
  DEPRECATED_STRATEGIES,
  OVERRIDING_STRATEGIES,
  SPACE_ALERTS
} from '@/helpers/constants';
import { offchainNetworks } from '@/networks';
import { Space } from '@/types';

export function useSpaceAlerts(space: Ref<Space>) {
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
      !space.value.snapshot_chain_id ||
      !networksLoaded.value ||
      space.value.turbo
    )
      return [];

    const ids = new Set<number>([
      space.value.snapshot_chain_id,
      ...space.value.strategies_params.map(strategy =>
        Number(strategy.network)
      ),
      ...space.value.strategies_params.flatMap(strategy =>
        Array.isArray(strategy.params?.strategies)
          ? strategy.params.strategies.map(param => Number(param.network))
          : []
      )
    ]);

    return Array.from(ids)
      .filter(n => !premiumChainIds.value.has(n))
      .map(chainId => networks.value.find(n => n.chainId === chainId))
      .filter(network => !!network);
  });

  const alerts = computed(() => {
    const alertsMap = new Map<number, Record<string, any>>();

    if (deprecatedStrategies.value.length) {
      alertsMap.set(SPACE_ALERTS.STRATEGIES_DEPRECATED, {
        strategies: deprecatedStrategies.value
      });
    }

    if (unsupportedProOnlyStrategies.value.length) {
      alertsMap.set(SPACE_ALERTS.STRATEGIES_PRO_ONLY, {
        strategies: unsupportedProOnlyStrategies.value
      });
    }

    if (unsupportedProOnlyNetworks.value.length) {
      alertsMap.set(SPACE_ALERTS.NETWORKS_PRO_ONLY, {
        networks: unsupportedProOnlyNetworks.value
      });
    }

    return alertsMap;
  });

  return {
    alerts
  };
}
