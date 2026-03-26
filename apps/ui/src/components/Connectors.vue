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
  const items = connectors.value
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

  items.push(connectors.value.find(c => c.type === 'guest')!);

  return items;
});
</script>

<template>
  <button
    v-for="connector in availableConnectors"
    :key="connector.id"
    type="button"
    class="flex w-full items-center gap-2.5 px-3.5 h-[52px] text-skin-link border-x border-b first-of-type:rounded-t-lg first-of-type:border-t last-of-type:rounded-b-lg hover:bg-skin-border/40"
    @click="emit('click', connector)"
  >
    <img
      v-if="connector.info.icon"
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
    <UiPill v-else-if="connector.type === 'injected'" label="Detected" />
  </button>
</template>
