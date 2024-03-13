<script setup lang="ts">
import Draggable from 'vuedraggable';
import { Choice, Proposal } from '@/types';

const props = defineProps<{
  sendingType: Choice | null;
  proposal: Proposal;
}>();

const emit = defineEmits<{
  (e: 'vote', value: Choice);
}>();

const selectedChoices = ref<number[]>(props.proposal.choices.map((_, i) => i + 1));
</script>

<template>
  <div class="flex flex-col space-y-3">
    <div class="flex flex-col space-y-2">
      <Draggable
        v-model="selectedChoices"
        v-bind="{ animation: 200 }"
        handle=".handle"
        class="flex flex-col gap-2 mb-3"
        item-key="id"
      >
        <template #item="{ element, index }">
          <UiButton class="!h-[48px] text-left w-full flex items-center handle cursor-grab gap-2">
            <div class="truncate">#{{ index + 1 }}</div>
            <div class="grow truncate">
              {{ proposal.choices[element - 1] }}
            </div>
            <div class="text-skin-text">
              <IC-drag />
            </div>
          </UiButton>
        </template>
      </Draggable>
    </div>
    <UiButton
      primary
      class="!h-[48px] w-full"
      :loading="!!sendingType"
      @click="emit('vote', selectedChoices)"
    >
      Vote
    </UiButton>
  </div>
</template>
