import {
  DEPRECATED_STRATEGIES,
  OVERRIDING_STRATEGIES,
  SPACE_ALERTS
} from '@/helpers/constants';
import { offchainNetworks } from '@/networks';
import { Space } from '@/types';

export function useSpaceAlerts(space: Ref<Space>) {
  const isOffchainSpace = computed(() =>
    offchainNetworks.includes(space.value.network)
  );

  const unsupportedOverridingStrategies = computed(() => {
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

  const alerts = computed(() => {
    const alertsMap = new Map<number, Record<string, any>>();

    if (deprecatedStrategies.value.length) {
      alertsMap.set(SPACE_ALERTS.STRATEGIES_DEPRECATED, {
        strategies: deprecatedStrategies.value
      });
    }

    if (unsupportedOverridingStrategies.value.length) {
      alertsMap.set(SPACE_ALERTS.STRATEGIES_PRO_ONLY, {
        strategies: unsupportedOverridingStrategies.value
      });
    }

    return alertsMap;
  });

  return {
    alerts
  };
}
