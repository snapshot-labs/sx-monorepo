<script lang="ts" setup>
import { Connector, ConnectorType } from '@/networks/types';

const props = defineProps<{
  supportedConnectors?: ConnectorType[];
}>();

const emit = defineEmits<{
  (e: 'click', connector: Connector): void;
}>();

const { connectors } = useConnectors();

const availableConnectors = computed(() => {
  return connectors.value.filter(connector => {
    return !(
      (props.supportedConnectors &&
        !props.supportedConnectors.includes(connector.type)) ||
      connector.type === 'gnosis'
    );
  });
});
</script>

<template>
  <UiButton
    v-for="connector in availableConnectors"
    :key="connector.id"
    class="w-full flex justify-center items-center gap-2"
    @click="emit('click', connector)"
  >
    <img
      :src="connector.info.icon"
      height="28"
      width="28"
      class="rounded-sm"
      :alt="connector.info.name"
    />
    {{ connector.info.name }}
  </UiButton>
</template>
