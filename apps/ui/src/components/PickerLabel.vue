<script setup lang="ts">
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Popover,
  PopoverButton,
  PopoverPanel
} from '@headlessui/vue';
import { ref } from 'vue';
import { SpaceMetadataLabel } from '@/types';

const props = defineProps<{
  labels: SpaceMetadataLabel[];
}>();

const selectedLabels = defineModel<string[]>({
  required: true
});

const searchValue = ref('');
const filteredLabels = computed(() =>
  props.labels.filter(label => {
    return (
      label.name.toLowerCase().includes(searchValue.value.toLowerCase()) ||
      label.description.toLowerCase().includes(searchValue.value.toLowerCase())
    );
  })
);
</script>

<template>
  <Popover v-slot="{ open }" class="relative contents">
    <PopoverButton :class="open ? 'text-white' : ''">
      <IH-pencil />
    </PopoverButton>

    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-1 opacity-0"
    >
      <PopoverPanel
        focus
        class="absolute z-10 left-0 mt-5 mx-4 w-full pb-3 bg-skin-bg"
        style="width: calc(100% - 48px)"
      >
        <Combobox
          v-slot="{ activeOption }"
          v-model="selectedLabels"
          multiple
          :nullable="true"
        >
          <div class="rounded-xl overflow-hidden shadow-bottom">
            <div
              class="flex items-center px-3 py-[14px] border-b bottom-line bg-skin-border"
            >
              <IH-search class="mr-2" />
              <ComboboxInput
                class="flex-auto bg-transparent text-skin-link"
                as="input"
                placeholder="Search"
                :value="searchValue"
                @change="searchValue = $event.target.value"
              />
            </div>
            <div class="max-h-[345px] overflow-auto no-scrollbar">
              <ComboboxOptions static hold>
                <ComboboxOption
                  v-for="label in filteredLabels"
                  :key="label.id"
                  :value="label.id"
                  class="px-3 py-[11.5px] cursor-pointer flex justify-between items-center bg-skin-border"
                  :class="activeOption === label.id ? 'bg-opacity-70' : ''"
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
                  <div v-if="selectedLabels.includes(label.id)">
                    <IH-check class="text-skin-success" />
                  </div>
                </ComboboxOption>
              </ComboboxOptions>
            </div>
          </div>
        </Combobox>
      </PopoverPanel>
    </transition>
  </Popover>
</template>
<style lang="scss" scoped>
.shadow-bottom {
  box-shadow: 0px 10px 15px -3px rgba(0, 0, 0, 0.1);
  .bottom-line {
    border-bottom-color: #1111110d;
  }
}
</style>
