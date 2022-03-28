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
    <template v-slot:header>
      <h3 v-text="'Timeline'" />
    </template>
    <div class="p-4 pl-5">
      <div class="flex relative">
        <div
          class="absolute w-[15px] h-[15px] inline-block rounded-full bg-gray-600 -left-[7px] top-[5px] border-[4px] border-skin-bg"
        />
        <div class="border-l pr-4 mt-3" />
        <div class="leading-6 mb-3">
          <h4>Created</h4>
          {{ _t(proposal.created) }}
        </div>
      </div>
      <div class="flex relative">
        <div
          class="absolute w-[15px] h-[15px] inline-block rounded-full bg-green -left-[7px] top-[5px] border-[4px] border-skin-bg"
        />
        <div class="border-l pr-4" />
        <div class="leading-6 mb-3">
          <h4>Start</h4>
          {{ _t(proposal.start) }}
        </div>
      </div>
      <div class="flex relative">
        <div
          class="absolute w-[15px] h-[15px] inline-block rounded-full bg-red -left-[7px] top-[5px] border-[4px] border-skin-bg"
        />
        <div class="border-l pr-4 mb-6" />
        <div class="leading-6">
          <h4>End</h4>
          {{ _t(proposal.end) }}
        </div>
      </div>
    </div>
  </UiModal>
</template>
