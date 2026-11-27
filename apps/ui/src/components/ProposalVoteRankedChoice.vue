<script setup lang="ts">
import { Choice, Proposal } from '@/types';

type RankedChoice = number[];

const props = defineProps<{
  proposal: Proposal;
  defaultChoice?: Choice;
  submitTo?: string;
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
    <UiReorderList
      v-model="selectedChoices"
      animated
      handle=".handle"
      class="flex flex-col gap-2"
      :item-key="(choice: number) => choice"
    >
      <template #item="{ element, index }">
        <UiButton :size="48" class="text-left handle cursor-grab touch-none">
          <IC-drag class="text-skin-text" />
          <UiTooltipOnTruncate
            :content="proposal.choices[element - 1]"
            class="grow"
          />
          <div
            class="h-[18px] min-w-[18px] rounded-full leading-[18px] text-[13px] text-skin-link bg-skin-border px-2 text-center inline-block"
          >
            #{{ index + 1 }}
          </div>
        </UiButton>
      </template>
    </UiReorderList>
    <teleport defer :to="submitTo" :disabled="!submitTo">
      <UiButton primary :size="48" @click="emit('vote', selectedChoices)">
        Vote
      </UiButton>
    </teleport>
  </div>
</template>
