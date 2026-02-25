<script setup lang="ts">
import Draggable from 'vuedraggable';
import { Choice, Proposal } from '@/types';

type RankedChoice = number[];

const props = defineProps<{
  proposal: Proposal;
  defaultChoice?: Choice;
}>();

const emit = defineEmits<{
  (e: 'vote', value: Choice): void;
}>();

const selectedChoices = ref<RankedChoice>(
  (props.proposal.privacy === 'none' &&
    (props.defaultChoice as RankedChoice)) ||
    Array.from({ length: props.proposal.choices.length }, (_, i) => i + 1).sort(
      () => Math.random() - 0.5
    )
);
</script>

<template>
  <div class="flex flex-col gap-3">
    <Draggable
      v-model="selectedChoices"
      v-bind="{ animation: 200 }"
      handle=".handle"
      class="flex flex-col gap-2"
      item-key="id"
    >
      <template #item="{ element, index }">
        <UiButton :size="48" class="text-left handle cursor-grab">
          <IC-drag class="text-skin-text" />
          <UiTooltipOnTruncate :content="proposal.choices[element - 1]" />
          <div
            class="h-[18px] min-w-[18px] rounded-full leading-[18px] text-[13px] text-skin-link bg-skin-border px-2 text-center inline-block"
          >
            #{{ index + 1 }}
          </div>
        </UiButton>
      </template>
    </Draggable>
    <UiButton primary :size="48" @click="emit('vote', selectedChoices)">
      Vote
    </UiButton>
  </div>
</template>
