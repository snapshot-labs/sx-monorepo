<script setup lang="ts">
import { Choice, Proposal } from '@/types';

defineProps<{
  sendingType: Choice | null;
  proposal: Proposal;
}>();

// const emit = defineEmits<{
//   (e: 'vote', value: Choice);
// }>();
</script>

<template>
  <div class="flex flex-col space-y-3">
    <div class="flex flex-col space-y-2">
      <UiButton
        v-for="(choice, index) in proposal.choices"
        :key="index"
        class="!h-[48px] text-left w-full flex items-center"
      >
        <div class="grow truncate">
          {{ choice }}
        </div>
      </UiButton>
    </div>
    <UiButton primary class="!h-[48px] w-full" :loading="!!sendingType"> Vote </UiButton>
  </div>
</template>
