<script setup lang="ts">
import Draggable from 'vuedraggable';
import { NetworkID, SpaceMetadataDelegation } from '@/types';

const model = defineModel<SpaceMetadataDelegation[]>({
  required: true
});

defineProps<{
  networkId: NetworkID;
  limit?: number;
}>();

const modalOpen = ref(false);

const editedDelegation = ref<number | null>(null);
const delegationInitialState = ref<SpaceMetadataDelegation | null>(null);

function addDelegationConfig(config: SpaceMetadataDelegation) {
  const newValue = [...model.value];

  if (editedDelegation.value !== null) {
    newValue[editedDelegation.value] = config;
    editedDelegation.value = null;
  } else {
    newValue.push(config);
  }

  model.value = newValue;
}

function addDelegation() {
  editedDelegation.value = null;
  delegationInitialState.value = null;

  modalOpen.value = true;
}

function editDelegation(index: number) {
  editedDelegation.value = index;
  delegationInitialState.value = model.value[index];

  modalOpen.value = true;
}

function deleteDelegation(index: number) {
  model.value = [
    ...model.value.slice(0, index),
    ...model.value.slice(index + 1)
  ];
}
</script>

<template>
  <h4 v-bind="$attrs" class="eyebrow mb-2 font-medium">Delegations</h4>
  <Draggable v-model="model" handle=".handle" :item-key="() => undefined">
    <template #item="{ element: delegation, index: i }">
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
            <div class="truncate mr-3">{{ delegation.name }}</div>
          </div>
        </div>
        <div class="flex gap-3">
          <button type="button" @click="editDelegation(i)">
            <IH-pencil />
          </button>
          <button type="button" @click="deleteDelegation(i)">
            <IH-trash />
          </button>
        </div>
      </div>
    </template>
  </Draggable>
  <UiButton
    v-if="limit ? model.length < limit : true"
    class="w-full"
    @click="addDelegation"
  >
    Add delegation
  </UiButton>
  <teleport to="#modal">
    <ModalDelegationConfig
      :open="modalOpen"
      :network-id="networkId"
      :initial-state="delegationInitialState ?? undefined"
      @close="modalOpen = false"
      @add="addDelegationConfig"
    />
  </teleport>
</template>
