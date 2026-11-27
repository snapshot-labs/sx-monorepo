<script setup lang="ts">
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList
} from '@ui-sdk/vue/command';
import { SpaceMetadataLabel } from '@/types';

defineProps<{
  labels: SpaceMetadataLabel[];
  buttonProps?: Record<string, any>;
  panelProps?: Record<string, any>;
}>();

defineSlots<{
  button(props: { close: () => void }): any;
}>();

const selectedLabels = defineModel<string[]>({
  required: true
});

const isOpen = ref(false);
const buttonEl = ref<HTMLElement | null>(null);
const panelEl = ref<HTMLElement | null>(null);

function close() {
  isOpen.value = false;
}

function toggleLabel(id: string) {
  selectedLabels.value = selectedLabels.value.includes(id)
    ? selectedLabels.value.filter(label => label !== id)
    : [...selectedLabels.value, id];
}

onClickOutside(panelEl, close, { ignore: [buttonEl] });

// The search field takes focus when the panel opens
watch(isOpen, async value => {
  if (!value) return;
  await nextTick();
  panelEl.value?.querySelector('input')?.focus();
});
</script>

<template>
  <div class="relative contents">
    <button
      ref="buttonEl"
      type="button"
      class="w-full"
      :class="isOpen ? 'text-skin-link' : 'text-skin-text'"
      :aria-expanded="isOpen"
      v-bind="buttonProps"
      @click="isOpen = !isOpen"
    >
      <slot name="button" :close="close">
        <IH-pencil />
      </slot>
    </button>
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-1 opacity-0"
    >
      <div
        v-if="isOpen"
        ref="panelEl"
        class="absolute z-30 left-0 -mt-2 mx-4 pb-3"
        style="width: calc(100% - 48px)"
        v-bind="panelProps"
      >
        <Command
          filter="contains"
          :auto-highlight="false"
          @action="toggleLabel"
        >
          <div class="bg-skin-bg rounded-xl overflow-hidden shadow-bottom">
            <div
              class="flex items-center px-3 py-[14px] bg-skin-border border-b border-skin-heading border-opacity-5"
            >
              <IH-search class="mr-2" />
              <!-- Escape doesn't clear the search, like before -->
              <CommandInput
                class="flex-auto bg-transparent text-skin-link"
                placeholder="Search"
                @keydown.escape.prevent
              />
            </div>
            <div class="max-h-[345px] overflow-auto no-scrollbar">
              <CommandList>
                <CommandItem
                  v-for="label in labels"
                  :key="label.id"
                  :value="label.id"
                  :label="label.name"
                  :keywords="[label.description]"
                  class="flex justify-between items-center bg-skin-border px-3 py-[11.5px] cursor-pointer w-full data-[highlighted]:bg-opacity-70"
                >
                  <div class="w-11/12">
                    <UiProposalLabel
                      :label="label.name || 'label preview'"
                      :color="label.color"
                    />
                    <div
                      v-if="label.description"
                      class="mt-2 truncate leading-[18px] text-sm"
                      v-text="label.description"
                    />
                  </div>
                  <div v-if="selectedLabels.includes(label.id)">
                    <IH-check class="text-skin-success" />
                  </div>
                </CommandItem>
              </CommandList>
            </div>
          </div>
        </Command>
      </div>
    </transition>
  </div>
</template>

<style lang="scss" scoped>
.shadow-bottom {
  box-shadow: 0px 10px 15px -3px rgba(0, 0, 0, 0.1);
}
</style>
