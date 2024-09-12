<script setup lang="ts">
import { getChoiceText } from '@/helpers/utils';
import { Proposal, Vote } from '@/types';

withDefaults(
  defineProps<{
    proposal: Proposal;
    vote: Vote;
    showReason?: boolean;
  }>(),
  {
    showReason: true
  }
);
</script>

<template>
  <div
    v-if="!!proposal.privacy && !proposal.completed"
    class="flex gap-1 items-center"
  >
    <span class="text-skin-heading leading-[22px]">Encrypted choice</span>
    <IH-lock-closed class="size-[16px] shrink-0" />
  </div>
  <div v-else class="flex flex-col max-w-full truncate items-start">
    <UiTooltip
      v-if="proposal.type !== 'basic'"
      :title="getChoiceText(proposal.choices, vote.choice)"
      class="max-w-full truncate"
    >
      <h4
        class="truncate"
        v-text="getChoiceText(proposal.choices, vote.choice)"
      />
    </UiTooltip>
    <div v-else class="flex items-center gap-2 truncate">
      <div
        class="shrink-0 rounded-full choice-bg inline-block size-[18px]"
        :class="`_${vote.choice}`"
      >
        <IH-check
          v-if="vote.choice === 1"
          class="text-white size-[14px] mt-0.5 ml-0.5"
        />
        <IH-x
          v-else-if="vote.choice === 2"
          class="text-white size-[14px] mt-0.5 ml-0.5"
        />
        <IH-minus-sm
          v-else-if="vote.choice === 3"
          class="text-white size-[14px] mt-0.5 ml-0.5"
        />
      </div>
      <h4
        class="truncate grow"
        v-text="proposal.choices[(vote.choice as number) - 1]"
      />
    </div>
    <div v-if="showReason" class="text-[17px] max-w-full truncate">
      {{ vote.reason }}
    </div>
  </div>
</template>
