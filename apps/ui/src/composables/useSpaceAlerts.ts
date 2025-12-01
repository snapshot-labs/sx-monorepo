import { evmNetworks, starknetNetworks } from '@snapshot-labs/sx';
import {
  DEPRECATED_STRATEGIES,
  DISABLED_STRATEGIES,
  OVERRIDING_STRATEGIES
} from '@/helpers/constants';
import { offchainNetworks } from '@/networks';
import { useRelayerInfoQuery } from '@/queries/relayerInfo';
import { Space } from '@/types';

const UPCOMING_PRO_ONLY_NETWORKS: readonly string[] = [
  '137' // Polygon
];

const PRO_EXPIRATION_WARNING_DAYS = 7;
const PRO_AFTER_EXPIRATION_WARNING_DAYS = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

type AlertType =
  | 'HAS_DEPRECATED_STRATEGIES'
  | 'HAS_DISABLED_STRATEGIES'
  | 'HAS_PRO_ONLY_STRATEGIES'
  | 'HAS_PRO_ONLY_NETWORKS'
  | 'HAS_PRO_ONLY_WHITELABEL'
  | 'IS_PRO_EXPIRING_SOON'
  | 'IS_PRO_JUST_EXPIRED'
  | 'IS_HIBERNATED'
  | 'IS_RELAYER_BALANCE_LOW';

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

  const { data: relayerInfo } = useRelayerInfoQuery(space);

  const unsupportedProOnlyStrategies = computed(() => {
    if (!isOffchainSpace.value) return [];

    return space.value.strategies.filter(
      strategy => OVERRIDING_STRATEGIES.includes(strategy) && !space.value.turbo
    );
  });

  const deprecatedStrategies = computed(() => {
    if (!isOffchainSpace.value) return [];

    return space.value.strategies.filter(strategy =>
      DEPRECATED_STRATEGIES.includes(strategy)
    );
  });

  const disabledStrategies = computed(() => {
    if (!isOffchainSpace.value) return [];

    return space.value.strategies.filter(strategy =>
      DISABLED_STRATEGIES.includes(strategy)
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

  const warningDaysBeforeProExpiration = computed(() => {
    const now = Date.now();
    const expirationTime = (space.value.turbo_expiration || 0) * 1000;
    const warningThresholdMs = PRO_EXPIRATION_WARNING_DAYS * DAY_IN_MS;

    if (expirationTime < now || expirationTime > now + warningThresholdMs) {
      return 0;
    }

    const diff = expirationTime - now;

    return Math.ceil(diff / DAY_IN_MS);
  });

  const isProJustExpired = computed(() => {
    const now = Date.now();
    const expirationTime = (space.value.turbo_expiration || 0) * 1000;
    const graceThresholdMs = PRO_AFTER_EXPIRATION_WARNING_DAYS * DAY_IN_MS;

    return expirationTime < now && expirationTime >= now - graceThresholdMs;
  });

  const sigAuthenticatorAddresses = computed(() => {
    const authenticators: Record<string, string | undefined> =
      { ...evmNetworks, ...starknetNetworks }[space.value.network]
        ?.Authenticators || {};

    return [
      authenticators.EthSig,
      authenticators.EthSigV2,
      authenticators.StarkSig
    ].filter(v => typeof v !== 'undefined');
  });

  const isRelayerBalanceLow = computed(() => {
    if (isOffchainSpace.value || !space.value.authenticators.length) {
      return false;
    }

    if (
      !space.value.authenticators.every(a =>
        sigAuthenticatorAddresses.value.includes(a)
      )
    ) {
      return false;
    }

    return !relayerInfo.value?.hasMinimumBalance;
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

    if (warningDaysBeforeProExpiration.value) {
      alertsMap.set('IS_PRO_EXPIRING_SOON', {
        daysUntilExpiration: warningDaysBeforeProExpiration.value
      });
    }

    if (isProJustExpired.value) {
      alertsMap.set('IS_PRO_JUST_EXPIRED', {});
    }

    if (space.value.additionalRawData?.hibernated) {
      alertsMap.set('IS_HIBERNATED', {});
    }

    if (isRelayerBalanceLow.value) {
      alertsMap.set('IS_RELAYER_BALANCE_LOW', {});
    }

    return alertsMap;
  });

  return {
    alerts
  };
}
