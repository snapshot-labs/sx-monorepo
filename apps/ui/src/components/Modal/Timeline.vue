<script setup>
import { _t } from '@/helpers/utils';

defineProps({
  open: Boolean,
  proposal: Object
});

defineEmits(['close']);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Timeline'" />
    </template>
    <div class="p-4 flex flex-column">
      <div class="mt-1 ml-2">
        <div
          v-for="state in ['created', 'start', 'end']"
          :key="state"
          class="flex relative h-[60px]"
        >
          <div
            class="absolute w-[15px] h-[15px] inline-block rounded-full -left-[7px] border-[4px] border-skin-bg"
            :class="
              ['created', 'start'].includes(state)
                ? 'bg-skin-heading'
                : 'bg-gray-600'
            "
          />
          <div
            v-if="state !== 'end'"
            class="border-l pr-4 mt-3"
            :class="['created'].includes(state) && 'border-skin-heading'"
          />
        </div>
      </div>
      <div class="flex-auto leading-6">
        <div
          v-for="state in ['created', 'start', 'end']"
          :key="state"
          class="mb-3 last:mb-0 h-[44px]"
        >
          <h4 class="capitalize" v-text="state" />
          {{ _t(proposal[state]) }}
        </div>
      </div>
    </div>
  </UiModal>
</template>
