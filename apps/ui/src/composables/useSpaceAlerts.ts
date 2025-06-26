import {
  DEPRECATED_STRATEGIES,
  OVERRIDING_STRATEGIES
} from '@/helpers/constants';
import { offchainNetworks } from '@/networks';
import { Space } from '@/types';

const UPCOMING_PRO_ONLY_NETWORKS: readonly number[] = [137];

type AlertType =
  | 'HAS_DEPRECATED_STRATEGIES'
  | 'HAS_PRO_ONLY_STRATEGIES'
  | 'HAS_PRO_ONLY_NETWORKS'
  | 'HAS_PRO_ONLY_WHITELABEL';

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
      .filter(
        n =>
          !premiumChainIds.value.has(n) ||
          UPCOMING_PRO_ONLY_NETWORKS.includes(n)
      )
      .map(chainId => networks.value.find(n => n.chainId === chainId))
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
