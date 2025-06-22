import { SPACE_ALERTS } from '@/helpers/constants';
import { offchainNetworks } from '@/networks';
import { Space } from '@/types';

const OVERRIDING_STRATEGIES: string[] = [
  'aura-vlaura-vebal-with-overrides',
  'balance-of-with-linear-vesting-power',
  'balancer-delegation',
  'cyberkongz',
  'cyberkongz-v2',
  'delegation',
  'delegation-with-cap',
  'delegation-with-overrides',
  'erc20-balance-of-delegation',
  'erc20-balance-of-fixed-total',
  'erc20-balance-of-quadratic-delegation',
  'erc20-votes-with-override',
  'esd-delegation',
  'ocean-dao-brightid',
  'orbs-network-delegation',
  'api-v2-override',
  'rocketpool-node-operator-delegate-v8',
  'eden-online-override'
] as const;

const DEPRECATED_STRATEGIES: string[] = ['multichain'] as const;

export function useSpaceAlerts(space: Ref<Space>) {
  const isOffchainSpace = computed(() =>
    offchainNetworks.includes(space.value.network)
  );

  const unsupportedOverridingStrategies = computed(() => {
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
