<script setup lang="ts">
import { getChoiceText, shortenAddress } from '@/helpers/utils';
import { useProposalVotesQuery } from '@/queries/votes';
import { Proposal as ProposalType } from '@/types';

const props = defineProps<{
  open: boolean;
  proposal: ProposalType;
}>();

defineEmits<{
  (e: 'close');
}>();

const { open } = toRefs(props);

const {
  data,
  fetchNextPage,
  hasNextPage,
  isPending,
  isError,
  isFetchingNextPage
} = useProposalVotesQuery({
  proposal: toRef(props, 'proposal'),
  choiceFilter: 'any',
  sortBy: 'vp-desc',
  enabled: open
});

async function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}

const isEncrypted = computed(() => {
  return props.proposal.privacy !== 'none' && !props.proposal.completed;
});
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Votes'" />
    </template>
    <UiLoading v-if="isPending" class="p-4 block text-center" />
    <div v-else-if="isError" class="p-4 text-center">Failed to load votes.</div>
    <div v-else-if="data?.pages.flat().length === 0" class="p-4 text-center">
      There are no votes here.
    </div>
    <UiContainerInfiniteScroll
      v-else-if="data"
      :loading-more="isFetchingNextPage"
      @end-reached="handleEndReached"
    >
      <div
        v-for="(vote, i) in data.pages.flat()"
        :key="i"
        class="py-3 px-4 border-b relative flex gap-2"
        :class="{ 'last:border-b-0': !isFetchingNextPage }"
      >
        <div
          v-if="!isEncrypted"
          class="absolute inset-y-0 right-0 h-[8px] z-[-1]"
          :style="{
            width: `${((100 / proposal.scores_total) * vote.vp).toFixed(2)}%`
          }"
          :class="
            proposal.type === 'basic'
              ? `choice-bg opacity-20 _${vote.choice}`
              : 'bg-skin-border'
          "
        />
        <AppLink
          :to="{
            name: 'space-user-statement',
            params: {
              space: `${proposal.network}:${proposal.space.id}`,
              user: vote.voter.id
            }
          }"
          class="grow flex space-x-2 items-center"
          @click="$emit('close')"
        >
          <UiStamp :id="vote.voter.id" :size="24" />
          <span>{{ vote.voter.name || shortenAddress(vote.voter.id) }}</span>
        </AppLink>

        <template v-if="isEncrypted">
          <div class="flex gap-1 items-center">
            <span class="text-skin-heading">Encrypted choice</span>
            <IH-lock-closed class="size-[16px] shrink-0" />
          </div>
        </template>
        <UiTooltip
          v-else
          class="text-skin-link truncate"
          :title="getChoiceText(proposal.choices, vote.choice)"
        >
          {{ getChoiceText(proposal.choices, vote.choice) }}
        </UiTooltip>
      </div>
    </UiContainerInfiniteScroll>
  </UiModal>
</template>
