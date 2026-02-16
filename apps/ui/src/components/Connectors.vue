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
          props.supportedConnectors &&
          !props.supportedConnectors.includes(connector.type)
        ) && !connector.autoConnectOnly
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
    class="w-full"
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
    <UiPill
      v-if="connector.id === recentConnector"
      variant="primary"
      label="Recent"
    />
    <UiPill
      v-else-if="connector.type === 'injected'"
      label="Detected"
    />
  </UiButton>
</template>
