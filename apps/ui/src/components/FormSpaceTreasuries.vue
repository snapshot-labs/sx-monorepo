<script setup lang="ts">
import Draggable from 'vuedraggable';
import { SpaceMetadataTreasury } from '@/types';

const model = defineModel<SpaceMetadataTreasury[]>({
  required: true
});

const { addNotification } = useUiStore();

const modalOpen = ref(false);

const editedTreasury = ref<number | null>(null);
const treasuryInitialState = ref<any | null>(null);

function addTreasuryConfig(config: SpaceMetadataTreasury) {
  const existingTreasuries = new Map(
    model.value.map(t => [`${t.name}-${t.network}-${t.address}`, true])
  );

  if (
    existingTreasuries.has(`${config.name}-${config.network}-${config.address}`)
  ) {
    return addNotification(
      'error',
      'Treasury with this name and wallet already exists'
    );
  }

  const newValue = [...model.value];

  if (editedTreasury.value !== null) {
    newValue[editedTreasury.value] = config;
    editedTreasury.value = null;
  } else {
    newValue.push(config);
  }

  model.value = newValue;
  modalOpen.value = false;
}

function addTreasury() {
  editedTreasury.value = null;
  treasuryInitialState.value = null;

  modalOpen.value = true;
}

function editTreasury(index: number) {
  editedTreasury.value = index;
  treasuryInitialState.value = model.value[index];

  modalOpen.value = true;
}

function deleteTreasury(index: number) {
  model.value = [
    ...model.value.slice(0, index),
    ...model.value.slice(index + 1)
  ];
}
</script>

<template>
  <h4 v-bind="$attrs" class="eyebrow mb-2 font-medium">Treasuries</h4>
  <Draggable v-model="model" handle=".handle" :item-key="() => undefined">
    <template #item="{ element: treasury, index: i }">
      <div
        class="flex justify-between items-center rounded-lg border px-4 py-3 mb-3 text-skin-link"
      >
        <div class="flex items-center">
          <div
            v-if="model.length > 1"
            class="handle mr-4 text-skin-link cursor-pointer opacity-50 hover:opacity-100"
          >
            <IH-switch-vertical />
          </div>
          <div class="flex min-w-0">
            <div class="truncate mr-3">{{ treasury.name }}</div>
          </div>
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
    </template>
  </Draggable>
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
