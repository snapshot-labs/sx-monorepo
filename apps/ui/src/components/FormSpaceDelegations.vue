<script setup lang="ts">
import { SpaceMetadataDelegation } from '@/types';

const props = defineProps<{
  delegationsValue: SpaceMetadataDelegation[];
}>();

const emit = defineEmits<{
  (e: 'delegations', value: SpaceMetadataDelegation[]);
}>();

const modalOpen = ref(false);

const editedDelegation = ref<number | null>(null);
const delegationInitialState = ref<SpaceMetadataDelegation | null>(null);

function addDelegationConfig(config: SpaceMetadataDelegation) {
  const newValue = [...props.delegationsValue];

  if (editedDelegation.value !== null) {
    newValue[editedDelegation.value] = config;
    editedDelegation.value = null;
  } else {
    newValue.push(config);
  }

  emit('delegations', newValue);
}

function addDelegation() {
  editedDelegation.value = null;
  delegationInitialState.value = null;

  modalOpen.value = true;
}

function editDelegation(index: number) {
  editedDelegation.value = index;
  delegationInitialState.value = props.delegationsValue[index];

  modalOpen.value = true;
}

function deleteDelegation(index: number) {
  const newValue = [
    ...props.delegationsValue.slice(0, index),
    ...props.delegationsValue.slice(index + 1)
  ];
  emit('delegations', newValue);
}
</script>

<template>
  <h4 v-bind="$attrs" class="eyebrow mb-2 font-medium">Delegations</h4>
  <div
    v-for="(delegation, i) in props.delegationsValue"
    :key="i"
    class="flex justify-between items-center rounded-lg border px-4 py-3 mb-3 text-skin-link"
  >
    <div class="flex min-w-0">
      <div class="truncate mr-3">{{ delegation.name }}</div>
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
  <UiButton class="w-full" @click="addDelegation">Add delegation</UiButton>
  <teleport to="#modal">
    <ModalDelegationConfig
      :open="modalOpen"
      :initial-state="delegationInitialState ?? undefined"
      @close="modalOpen = false"
      @add="addDelegationConfig"
    />
  </teleport>
</template>
