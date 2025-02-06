<script setup lang="ts">
import SpaceCreateSnapshot from '@/components/SpaceCreateSnapshot.vue';
import SpaceCreateSnapshotX from '@/components/SpaceCreateSnapshotX.vue';
import { enabledNetworks, offchainNetworks } from '@/networks';
import { ExplorePageProtocol } from '@/networks/types';

type Protocol = {
  component: Component;
  networkId?: string;
};
type ProtocolRecords = Record<ExplorePageProtocol, Protocol>;

const PROTOCOLS: ProtocolRecords = {
  snapshotx: {
    component: SpaceCreateSnapshotX
  },
  snapshot: {
    component: SpaceCreateSnapshot,
    networkId: enabledNetworks.find(id => offchainNetworks.includes(id))
  }
} as const;

const route = useRoute();
useTitle('Create space');

const protocol = computed(() => route.params.protocol as string);
</script>

<template>
  <div v-if="PROTOCOLS[protocol]" class="pt-5 max-w-[50rem] mx-auto px-4">
    <component
      :is="PROTOCOLS[protocol].component"
      :network-id="PROTOCOLS[protocol].networkId"
    />
  </div>
</template>
