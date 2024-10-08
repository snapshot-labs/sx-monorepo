<script setup lang="ts">
import { getInjected } from '@snapshot-labs/lock/src/utils';
import connectors, {
  getConnectorIconUrl,
  mapConnectorId
} from '@/helpers/connectors';

const win = window;

const injected = getInjected();
if (injected)
  connectors['injected'] = {
    ...connectors['injected'],
    ...injected,
    id: 'injected',
    icon: connectors[mapConnectorId(injected.id)]?.icon ?? injected.icon
  };

const props = defineProps<{
  open: boolean;
  supportedConnectors: string[];
}>();
const emit = defineEmits<{
  (e: 'pick', connector: string): void;
  (e: 'close'): void;
}>();

const { open } = toRefs(props);

const availableConnectors = computed(() => {
  return Object.values(connectors).filter(connector => {
    if (!props.supportedConnectors.includes(connector.id)) return false;

    const hasNoType = !('type' in connector) || !connector.type;
    const isActive =
      'type' in connector &&
      'root' in connector &&
      connector.type === 'injected' &&
      win[connector.root];

    return hasNoType || isActive;
  });
});
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3 v-text="'Log in'" />
    </template>
    <div>
      <div class="m-4 space-y-2 flex flex-col">
        <button
          v-for="connector in availableConnectors"
          :key="connector.id"
          type="button"
          @click="emit('pick', connector.id)"
        >
          <UiButton class="w-full flex justify-center items-center">
            <img
              :src="getConnectorIconUrl(connector.icon)"
              height="28"
              width="28"
              class="mr-2 -mt-1"
              :alt="connector.name"
            />
            {{ connector.name }}
          </UiButton>
        </button>
      </div>
    </div>
  </UiModal>
</template>
