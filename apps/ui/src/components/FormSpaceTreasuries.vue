<script setup lang="ts">
import { SpaceMetadataTreasury } from '@/types';

const props = defineProps<{
  treasuriesValue: SpaceMetadataTreasury[];
}>();

const emit = defineEmits<{
  (e: 'treasuries', value: SpaceMetadataTreasury[]);
}>();

const modalOpen = ref(false);

const editedTreasury = ref<number | null>(null);
const treasuryInitialState = ref<any | null>(null);

function addTreasuryConfig(config: SpaceMetadataTreasury) {
  const newValue = [...props.treasuriesValue];

  if (editedTreasury.value !== null) {
    newValue[editedTreasury.value] = config;
    editedTreasury.value = null;
  } else {
    newValue.push(config);
  }

  emit('treasuries', newValue);
}

function addTreasury() {
  editedTreasury.value = null;
  treasuryInitialState.value = null;

  modalOpen.value = true;
}

function editTreasury(index: number) {
  editedTreasury.value = index;
  treasuryInitialState.value = props.treasuriesValue[index];

  modalOpen.value = true;
}

function deleteTreasury(index: number) {
  const newValue = [
    ...props.treasuriesValue.slice(0, index),
    ...props.treasuriesValue.slice(index + 1)
  ];
  emit('treasuries', newValue);
}
</script>

<template>
  <h4 v-bind="$attrs" class="eyebrow mb-2 font-medium">Treasuries</h4>
  <div
    v-for="(treasury, i) in props.treasuriesValue"
    :key="i"
    class="flex justify-between items-center rounded-lg border px-4 py-3 mb-3 text-skin-link"
  >
    <div class="flex min-w-0">
      <div class="whitespace-nowrap">{{ treasury.name }}</div>
    </div>
    <div class="flex gap-3">
      <button type="button" @click="editTreasury(i)">
        <IH-pencil />
      </button>
      <button type="button" @click="deleteTreasury(i)">
        <IH-trash />
      </button>
    </div>
  </div>
  <UiButton class="w-full" @click="addTreasury">Add treasury</UiButton>
  <teleport to="#modal">
    <ModalTreasuryConfig
      :open="modalOpen"
      :initial-state="treasuryInitialState ?? undefined"
      @close="modalOpen = false"
      @add="addTreasuryConfig"
    />
  </teleport>
</template>
