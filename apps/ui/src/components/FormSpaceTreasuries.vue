<script setup lang="ts">
import Draggable from 'vuedraggable';
import { shorten } from '@/helpers/utils';
import { NetworkID, SpaceMetadataTreasury } from '@/types';

const model = defineModel<SpaceMetadataTreasury[]>({
  required: true
});

defineProps<{
  networkId: NetworkID;
  limit?: number;
}>();

const { addNotification } = useUiStore();

const modalOpen = ref(false);

const editedTreasury = ref<number | null>(null);
const treasuryInitialState = ref<any | null>(null);

function addTreasuryConfig(config: SpaceMetadataTreasury) {
  const otherTreasuries =
    editedTreasury.value !== null
      ? model.value
          .slice(0, editedTreasury.value)
          .concat(model.value.slice(editedTreasury.value + 1))
      : model.value;

  const getId = (t: SpaceMetadataTreasury) => {
    return `${t.name}-${t.chainId}-${t.address}`;
  };

  const existingTreasuries = new Map(
    otherTreasuries.map(t => [getId(t), true])
  );

  if (existingTreasuries.has(getId(config))) {
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
        class="flex justify-between items-center first-of-type:rounded-t-lg last-of-type:rounded-b-lg first-of-type:border-t border-b border-x last-of-type:mb-3 px-4 py-3 text-skin-link"
      >
        <div class="flex items-center">
          <div
            v-if="model.length > 1"
            class="handle mr-3 text-skin-link cursor-pointer opacity-50 hover:opacity-100"
          >
            <IH-switch-vertical />
          </div>
          <div class="flex items-center">
            <UiBadgeNetwork
              :chain-id="treasury.chainId"
              class="mr-3 hidden sm:block"
            >
              <UiStamp
                :id="treasury.address"
                type="avatar"
                :size="32"
                class="rounded-md"
              />
            </UiBadgeNetwork>
            <div class="flex-1 leading-[22px]">
              <h4
                class="text-skin-link"
                v-text="treasury.name || shorten(treasury.address)"
              />
              <UiAddress
                class="text-skin-text text-[17px]"
                :address="treasury.address"
              />
            </div>
          </div>
        </div>
        <div class="flex gap-3">
          <UiTooltip title="Edit treasury">
            <UiButton
              class="!px-0 w-[46px] inline-flex items-center justify-center"
              @click="editTreasury(i)"
            >
              <IH-pencil />
            </UiButton>
          </UiTooltip>
          <UiTooltip title="Delete treasury">
            <UiButton
              class="!px-0 w-[46px] inline-flex items-center justify-center"
              @click="deleteTreasury(i)"
            >
              <IH-trash />
            </UiButton>
          </UiTooltip>
        </div>
      </div>
    </template>
  </Draggable>
  <UiButton
    v-if="limit ? model.length < limit : true"
    class="w-full"
    @click="addTreasury"
    >Add treasury</UiButton
  >
  <teleport to="#modal">
    <ModalTreasuryConfig
      :open="modalOpen"
      :network-id="networkId"
      :initial-state="treasuryInitialState ?? undefined"
      @close="modalOpen = false"
      @add="addTreasuryConfig"
    />
  </teleport>
</template>

<style scoped lang="scss">
.sortable-chosen {
  @apply border border-dashed rounded-none;
}
</style>
