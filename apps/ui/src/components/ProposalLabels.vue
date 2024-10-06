<script setup lang="ts">
import { Draft, Proposal, SpaceMetadataLabel } from '@/types';

const props = withDefaults(
  defineProps<{
    labels: SpaceMetadataLabel[];
    proposal: Proposal | Draft;
    showEdit?: boolean;
    inline?: boolean;
  }>(),
  {
    showEdit: false,
    inline: false
  }
);

const emit = defineEmits<{
  (e: 'updateProposalLabels', id: string): void;
}>();

const searchValue = ref('');
const labelSelectorOpen = ref(false);
const labelSelector = ref(null);

const selectedLabels = computed(() => {
  return props.proposal.labels
    .filter(id => props.labels.some(label => label.id === id))
    .map(id => {
      return props.labels.find(label => label.id === id)!;
    });
});

const filteredLabels = computed(() =>
  props.labels.filter(label => {
    return (
      label.name.toLowerCase().includes(searchValue.value.toLowerCase()) ||
      label.description.toLowerCase().includes(searchValue.value.toLowerCase())
    );
  })
);

onClickOutside(labelSelector, () => {
  if (labelSelectorOpen.value) {
    labelSelectorOpen.value = false;
  }
});

function handleLabelClick(id: string) {
  emit('updateProposalLabels', id);
}
</script>
<template>
  <div v-if="inline" class="contents">
    <div v-for="label in selectedLabels" :key="label.id" class="mr-2">
      <UiProposalLabel :label="label.name" :color="label.color" />
    </div>
  </div>
  <div v-else>
    <div class="flex justify-between">
      <h4 class="eyebrow mb-2" v-text="'Labels'" />
      <button
        v-if="showEdit"
        type="button"
        class="h-0"
        @click="labelSelectorOpen = true"
      >
        <IH-pencil />
      </button>
    </div>
    <div
      v-if="labelSelectorOpen && showEdit"
      ref="labelSelector"
      class="rounded-xl overflow-hidden shadow-bottom"
    >
      <div
        class="flex items-center px-3 py-[14px] border-b bottom-line bg-skin-border"
      >
        <IH-search class="mr-2" />
        <input
          ref="searchInput"
          v-model="searchValue"
          type="text"
          placeholder="Search"
          class="flex-auto bg-transparent text-skin-link"
        />
      </div>
      <div class="max-h-[300px] overflow-auto no-scrollbar">
        <div
          v-for="(label, i) in filteredLabels"
          :key="i"
          class="px-3 py-[11.5px] bg-skin-border hover:bg-opacity-70 cursor-pointer flex justify-between items-center"
          @click="handleLabelClick(label.id)"
        >
          <div>
            <UiProposalLabel
              :label="label.name || 'label preview'"
              :color="label.color"
            />
            <div class="mt-2 truncate leading-[18px]">
              {{ label.description || 'No description' }}
            </div>
          </div>
          <div v-if="proposal.labels.includes(label.id)">
            <IH-check class="text-skin-success" />
          </div>
        </div>
        <div
          v-if="filteredLabels.length === 0"
          class="px-3 py-[11.5px] bg-skin-border"
        >
          No results
        </div>
      </div>
    </div>
    <div v-else-if="selectedLabels.length" class="flex flex-wrap mt-2">
      <div v-for="label in selectedLabels" :key="label.id" class="mr-2 mb-2">
        <UiProposalLabel :label="label.name" :color="label.color" />
      </div>
    </div>
    <div v-else class="mt-1">No labels yet</div>
  </div>
</template>

<style lang="scss" scoped>
.shadow-bottom {
  box-shadow: 0px 10px 15px -3px rgba(0, 0, 0, 0.1);
  .bottom-line {
    border-bottom-color: #1111110d;
  }
}
</style>
