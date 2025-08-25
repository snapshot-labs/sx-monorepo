<script lang="ts" setup>
import { Network } from '@/networks/types';

defineProps<{
  disabled: boolean;
  controller: string;
  network: Network;
}>();

const emit = defineEmits<{
  (e: 'save', value: string);
}>();

const changeControllerModalOpen = ref(false);

function handleSave(value: string) {
  changeControllerModalOpen.value = false;
  emit('save', value);
}
</script>
<template>
  <div>
    <div
      class="flex justify-between items-center rounded-lg border px-4 py-3 text-skin-link"
    >
      <div class="flex flex-col">
        <a
          :href="network.helpers.getExplorerUrl(controller, 'contract')"
          target="_blank"
          class="flex items-center text-skin-text leading-5 group"
        >
          <UiStamp
            :id="controller"
            type="avatar"
            :size="18"
            class="mr-2 !rounded"
          />
          <UiAddress :address="controller" />
          <IH-arrow-sm-right class="-rotate-45" />
        </a>
      </div>
      <button
        type="button"
        :disabled="disabled"
        :class="{
          'opacity-40 cursor-not-allowed text-skin-text': disabled
        }"
        @click="changeControllerModalOpen = true"
      >
        <IH-pencil />
      </button>
    </div>
    <teleport to="#modal">
      <ModalChangeController
        :open="changeControllerModalOpen"
        :chain-id="network.chainId"
        :initial-state="{ controller }"
        @close="changeControllerModalOpen = false"
        @save="handleSave"
      />
    </teleport>
  </div>
</template>
