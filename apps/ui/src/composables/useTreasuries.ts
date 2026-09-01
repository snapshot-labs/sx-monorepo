import {
  getSafeSnapConfig,
  getSafeSnapStrategies
} from '@/helpers/safesnap/strategies';
import { compareAddresses } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { SelectedStrategy, Space, SpaceMetadataTreasury } from '@/types';

export type StrategyWithTreasury = SelectedStrategy & {
  treasury: SpaceMetadataTreasury;
};

type InputType = Space | null;
export function useTreasuries(spaceRef: ComputedRef<InputType> | InputType) {
  const isResolvingTreasuries = ref(false);
  const strategiesWithTreasuries = computedAsync(
    async () => {
      const space = unref(spaceRef);

      if (!space) return null;

      const treasuryStrategies = space.treasuries.map(treasury => {
        const strategy = space.executors_strategies.find(strategy => {
          return (
            strategy.treasury &&
            strategy.treasury_chain &&
            treasury.address &&
            compareAddresses(strategy.treasury, treasury.address) &&
            treasury.chainId === String(strategy.treasury_chain)
          );
        });

        if (!strategy) {
          return {
            address: treasury.address,
            destinationAddress: '0x0',
            type: 'ReadOnlyExecution',
            treasury
          };
        }

        return {
          address: strategy.address,
          destinationAddress: strategy.destination_address,
          type: strategy.type,
          treasury
        };
      });

      // computedAsync's default onError is a noop, so an unhandled rejection
      // would pin strategiesWithTreasuries at null — which the submit gate
      // reads as "still resolving", blocking every proposal on the space.
      let safeSnapStrategies: StrategyWithTreasury[] = [];
      try {
        safeSnapStrategies = await getSafeSnapStrategies(space);
      } catch (err) {
        console.error(
          'useTreasuries: failed to resolve SafeSnap strategies',
          err
        );
      }

      // A SafeSnap module supersedes a plain treasury for the same Safe.
      const strategies = [
        ...treasuryStrategies.filter(
          strategy =>
            !safeSnapStrategies.some(
              safeSnap =>
                compareAddresses(
                  safeSnap.treasury.address,
                  strategy.treasury.address
                ) && safeSnap.treasury.chainId === strategy.treasury.chainId
            )
        ),
        ...safeSnapStrategies
      ];

      return strategies.filter(strategy =>
        getNetwork(space.network).helpers.isExecutorSupported(strategy.type)
      ) as StrategyWithTreasury[];
    },
    null,
    isResolvingTreasuries
  );

  // Gate only spaces with a SafeSnap config: everything else settles on the
  // next tick, so `null` there is not worth blocking submit on.
  const isSafeSnapResolving = computed(() => {
    const space = unref(spaceRef);

    return (
      !!space &&
      !!getSafeSnapConfig(space) &&
      strategiesWithTreasuries.value === null
    );
  });

  return {
    isResolvingTreasuries,
    isSafeSnapResolving,
    strategiesWithTreasuries
  };
}
