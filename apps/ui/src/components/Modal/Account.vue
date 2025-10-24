<script setup lang="ts">
import { Connector } from '@/networks/types';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'login', connector: Connector): void;
  (e: 'close'): void;
}>();

const { open } = toRefs(props);

const step: Ref<'connect' | null> = ref(null);

const { web3 } = useWeb3();

watch(open, () => (step.value = null));
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3 v-text="web3.account ? 'Change wallet' : 'Log in'" />
    </template>
    <div class="m-4 flex flex-col gap-2">
      <Connectors @click="(connector: Connector) => emit('login', connector)" />
    </div>
  </UiModal>
</template>
