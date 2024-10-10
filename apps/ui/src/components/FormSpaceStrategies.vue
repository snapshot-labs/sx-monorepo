<script setup lang="ts">
import { MAX_STRATEGIES } from '@/helpers/turbo';
import { StrategyConfig } from '@/networks/types';
import { NetworkID, Space } from '@/types';

const snapshotChainId = defineModel<number>('snapshotChainId', {
  required: true
});
const strategies = defineModel<StrategyConfig[]>('strategies', {
  required: true
});

const props = defineProps<{
  networkId: NetworkID;
  isTicketValid: boolean;
  space: Space;
}>();

const strategiesLimit = computed(() => {
  const spaceType = props.space.turbo
    ? 'turbo'
    : props.space.verified
      ? 'verified'
      : 'default';

  return MAX_STRATEGIES[spaceType];
});
</script>

<template>
  <h4 class="eyebrow mb-2 font-medium">Strategies</h4>
  <div class="s-box mb-4">
    <UiSelectorNetwork
      v-model="snapshotChainId"
      :definition="{
        type: 'number',
        title: 'Network',
        tooltip:
          'The default network used for this space. Networks can also be specified in individual strategies',
        examples: ['Select network'],
        networkId
      }"
    />
  </div>
  <UiContainerSettings
    :title="`Select up to ${strategiesLimit} strategies`"
    description="(Voting power is cumulative)"
  >
    <UiMessage
      v-if="!isTicketValid"
      type="danger"
      learn-more-link="https://snapshot.mirror.xyz/-uSylOUP82hGAyWUlVn4lCg9ESzKX9QCvsUgvv-ng84"
      class="mb-3"
    >
      In order to use the "ticket" strategy you are required to set a voting
      validation strategy. This combination reduces the risk of spam and sybil
      attacks.
    </UiMessage>
    <UiStrategiesConfiguratorOffchain
      v-model:model-value="strategies"
      :network-id="networkId"
      :default-chain-id="snapshotChainId"
      :limit="strategiesLimit"
    />
  </UiContainerSettings>
</template>
