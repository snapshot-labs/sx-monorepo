<script setup lang="ts">
import { Contract } from '@ethersproject/contracts';
import { useQuery } from '@tanstack/vue-query';
import { getProvider } from '@/helpers/provider';
import { compareAddresses, shorten } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { StrategyConfig } from '@/networks/types';
import { NetworkID, Space } from '@/types';

const NETWORKS_WITHOUT_ZODIAC_APP: NetworkID[] = ['ape', 'curtis'];

const SAFE_ABI = [
  'function isModuleEnabled(address module) view returns (bool)'
];

const props = defineProps<{
  space: Space;
  executionStrategies: StrategyConfig[];
}>();

const treasuryMap = computed(() => {
  return Object.fromEntries(
    props.executionStrategies
      .map(strategy => {
        const treasury = props.space.executors_strategies.find(
          t => t.treasury && compareAddresses(t.address, strategy.address)
        );

        if (!treasury) return null;

        return [strategy.address, treasury.treasury];
      })
      .filter(v => v !== null)
  );
});

const {
  isPending,
  isError,
  data: moduleEnabled
} = useQuery({
  queryKey: [
    'executionStrategiesInfo',
    () => props.space.id,
    () => props.executionStrategies
  ],
  queryFn: async () => {
    const network = getNetwork(props.space.network);
    const provider = getProvider(Number(network.chainId));

    const avararExecutionStrategies = props.executionStrategies.filter(
      strategy => strategy.type === 'SimpleQuorumAvatar'
    );

    const results: [string, boolean][] = [];

    for (const strategy of avararExecutionStrategies) {
      const treasury = treasuryMap.value[strategy.address];
      if (!treasury) continue;

      const safeContract = new Contract(treasury, SAFE_ABI, provider);

      const isEnabled: boolean = await safeContract.isModuleEnabled(
        strategy.address
      );

      results.push([strategy.address, isEnabled]);
    }

    return Object.fromEntries(results);
  }
});

function getZodiacAppUrl(strategyAddress: string) {
  const treasuryAddress = treasuryMap.value[strategyAddress];

  return `https://app.safe.global/apps/open?safe=${props.space.network}:${treasuryAddress}&appUrl=https%3A%2F%2Fzodiac.gnosisguild.org%2F`;
}
</script>

<template>
  <div>
    <UiLoading v-if="isPending" />
    <UiStateWarning v-else-if="isError">
      Error while loading execution strategies.
    </UiStateWarning>
    <div
      v-for="executionStrategy in executionStrategies"
      v-else
      :key="executionStrategy.address"
      class="flex justify-between items-center first-of-type:rounded-t-lg last-of-type:rounded-b-lg first-of-type:border-t border-b border-x px-4 py-3 text-skin-link"
    >
      <div class="flex items-center">
        <UiBadgeNetwork
          :chain-id="executionStrategy.chainId"
          class="mr-3 hidden sm:block"
        >
          <UiStamp
            :id="executionStrategy.address"
            type="avatar"
            :size="32"
            class="rounded-md"
          />
        </UiBadgeNetwork>
        <div class="flex-1 leading-[22px]">
          <div class="flex items-center space-x-2">
            <h4
              class="text-skin-link"
              v-text="
                executionStrategy.name || shorten(executionStrategy.address)
              "
            />
            <a
              v-if="executionStrategy.type === 'SimpleQuorumAvatar'"
              href="#"
              target="_blank"
              class="inline-block"
            >
              <IH-question-mark-circle />
            </a>
          </div>
          <UiAddress
            class="text-skin-text text-[17px]"
            :address="executionStrategy.address"
          />
        </div>
      </div>
      <div class="flex gap-3">
        <template
          v-if="
            moduleEnabled && executionStrategy.type === 'SimpleQuorumAvatar'
          "
        >
          <div
            v-if="moduleEnabled[executionStrategy.address]"
            class="text-skin-border"
          >
            Safe module is enabled
          </div>
          <UiButton
            v-else-if="!NETWORKS_WITHOUT_ZODIAC_APP.includes(space.network)"
            :to="getZodiacAppUrl(executionStrategy.address)"
          >
            Enable
            <IH-arrow-sm-right class="-rotate-45 -mr-2" />
          </UiButton>
        </template>
      </div>
    </div>
  </div>
</template>
