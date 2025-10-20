import {
  DEPRECATED_STRATEGIES,
  DISABLED_STRATEGIES,
  OVERRIDING_STRATEGIES
} from '@/helpers/constants';
import { offchainNetworks } from '@/networks';
import { Space } from '@/types';

const UPCOMING_PRO_ONLY_NETWORKS: readonly string[] = [
  '137' // Polygon
];

type AlertType =
  | 'HAS_DEPRECATED_STRATEGIES'
  | 'HAS_DISABLED_STRATEGIES'
  | 'HAS_PRO_ONLY_STRATEGIES'
  | 'HAS_PRO_ONLY_NETWORKS'
  | 'HAS_PRO_ONLY_WHITELABEL'
  | 'PRO_EXPIRING_SOON';

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

  const disabledStrategies = computed(() => {
    if (!isOffchainSpace.value) return [];

    return space.value.strategies.filter(strategy =>
      (DISABLED_STRATEGIES as readonly string[]).includes(strategy)
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

  const isProExpiringSoon = computed(() => {
    // Check if expiration date exists and is valid (greater than 0)
    if (!space.value.turbo_expiration || space.value.turbo_expiration === 0) {
      console.log('[SpaceAlerts] No expiration timestamp:', {
        turbo: space.value.turbo,
        turbo_expiration: space.value.turbo_expiration
      });
      return false;
    }

    const now = Date.now();
    const expirationTime = space.value.turbo_expiration * 1000; // Convert to milliseconds
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    // Check if expiration is in the future and within 7 days
    const isInFuture = expirationTime > now;
    const isWithinSevenDays = expirationTime - now <= sevenDaysInMs;
    const isExpiring = isInFuture && isWithinSevenDays;

    console.log('[SpaceAlerts] Pro expiration check:', {
      turbo: space.value.turbo,
      turbo_expiration: space.value.turbo_expiration,
      expirationTime,
      expirationDate: new Date(expirationTime).toISOString(),
      now,
      nowDate: new Date(now).toISOString(),
      diff: expirationTime - now,
      diffDays: (expirationTime - now) / (24 * 60 * 60 * 1000),
      sevenDaysInMs,
      isInFuture,
      isWithinSevenDays,
      isExpiring
    });

    return isExpiring;
  });

  const daysUntilExpiration = computed(() => {
    if (!space.value.turbo_expiration || space.value.turbo_expiration === 0) return 0;

    const now = Date.now();
    const expirationTime = space.value.turbo_expiration * 1000;
    const diff = expirationTime - now;

    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  });

  const alerts = computed(() => {
    const alertsMap = new Map<AlertType, Record<string, any>>();

    if (deprecatedStrategies.value.length) {
      alertsMap.set('HAS_DEPRECATED_STRATEGIES', {
        strategies: deprecatedStrategies.value
      });
    }

    if (disabledStrategies.value.length) {
      alertsMap.set('HAS_DISABLED_STRATEGIES', {
        strategies: disabledStrategies.value
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

    if (isProExpiringSoon.value) {
      alertsMap.set('PRO_EXPIRING_SOON', {
        daysUntilExpiration: daysUntilExpiration.value
      });
    }

    return alertsMap;
  });

  return {
    alerts
  };
}
