<script lang="ts" setup>
import { RECENT_CONNECTOR } from '@/helpers/constants';
import { lsGet } from '@/helpers/utils';
import { Connector, ConnectorType } from '@/networks/types';

const props = defineProps<{
  supportedConnectors?: ConnectorType[];
}>();

const emit = defineEmits<{
  (e: 'click', connector: Connector): void;
}>();

const recentConnector = lsGet(RECENT_CONNECTOR);

const { connectors } = useConnectors();

const availableConnectors = computed(() => {
  return connectors.value
    .filter(connector => {
      return (
        !(
          (props.supportedConnectors &&
            !props.supportedConnectors.includes(connector.type)) ||
          connector.type === 'gnosis'
        ) && connector.id !== 'unicorn'
      );
    })
    .sort((a, b) =>
      a.id === recentConnector ? -1 : b.id === recentConnector ? 1 : 0
    );
});
</script>

<template>
  <UiButton
    v-for="connector in availableConnectors"
    :key="connector.id"
    class="w-full flex items-center gap-2 !px-3"
    @click="emit('click', connector)"
  >
    <img
      :src="connector.info.icon"
      height="28"
      width="28"
      class="rounded-sm"
      :alt="connector.info.name"
    />
    <span class="flex-grow text-left" v-text="connector.info.name" />
    <span
      v-if="connector.id === recentConnector"
      class="inline-block bg-skin-link text-skin-bg text-[13px] rounded-full px-1.5"
      v-text="'Recent'"
    />
    <span
      v-else-if="connector.type === 'injected'"
      class="inline-block bg-skin-border text-skin-link text-[13px] rounded-full px-1.5"
      v-text="'Detected'"
    />
  </UiButton>
</template>
