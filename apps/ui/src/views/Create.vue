<script setup lang="ts">
import SpaceCreateOffchain from '@/components/SpaceCreateOffchain.vue';
import SpaceCreateOnchain from '@/components/SpaceCreateOnchain.vue';
import { enabledNetworks, offchainNetworks } from '@/networks';
import IHBolt from '~icons/heroicons-outline/bolt';
import IHLink from '~icons/heroicons-outline/link';

type ProtocolId = 'onchain' | 'offchain';
type Protocol = {
  label: string;
  description: string;
  icon: any;
  component: any;
  isEnabled: boolean;
  networkId?: string;
};
type ProtocolRecords = Record<ProtocolId, Protocol>;

const PROTOCOLS: ProtocolRecords = {
  onchain: {
    label: 'Onchain space',
    description: 'Create a space onchain',
    icon: IHLink,
    component: SpaceCreateOnchain,
    isEnabled: enabledNetworks.some(
      network => !offchainNetworks.includes(network)
    )
  },
  offchain: {
    label: 'Offchain space',
    description: 'Create a space offchain',
    icon: IHBolt,
    component: SpaceCreateOffchain,
    isEnabled: enabledNetworks.some(network =>
      offchainNetworks.includes(network)
    ),
    networkId: enabledNetworks.find(id => offchainNetworks.includes(id))
  }
} as const;

useTitle('Create space');

const protocol = ref<ProtocolId>();

const availableProtocols = computed(
  () =>
    Object.fromEntries(
      Object.entries(PROTOCOLS).filter(([, value]) => value.isEnabled)
    ) as ProtocolRecords
);

function handleClick(value: string) {
  protocol.value = value as ProtocolId;
}

onMounted(() => {
  const availableProtocolIds = Object.keys(
    availableProtocols.value
  ) as ProtocolId[];

  if (availableProtocolIds.length === 1) {
    protocol.value = availableProtocolIds[0];
  }
});
</script>

<template>
  <div v-if="!protocol" class="max-w-[50rem] mx-auto pt-5 px-4 space-y-4">
    <h2>What kind of space do you want to create?</h2>
    <div class="flex w-full flex-col md:flex-row gap-3">
      <UiSelectorCard
        v-for="(item, id) in availableProtocols"
        :key="id"
        :item="{ ...PROTOCOLS[id], key: id }"
        @click="handleClick"
      />
    </div>
  </div>
  <div v-else class="pt-5 max-w-[50rem] mx-auto px-4">
    <component
      :is="PROTOCOLS[protocol].component"
      :network-id="PROTOCOLS[protocol].networkId"
    />
  </div>
</template>
