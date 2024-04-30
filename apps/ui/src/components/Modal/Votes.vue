<script setup lang="ts">
import { getNetwork } from '@/networks';
import { shortenAddress, getChoiceText } from '@/helpers/utils';
import { Proposal as ProposalType, Vote } from '@/types';

const LIMIT = 20;

const props = defineProps<{
  open: boolean;
  proposal: ProposalType;
}>();

defineEmits<{
  (e: 'close');
}>();

const votes: Ref<Vote[]> = ref([]);
const loaded = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const { open } = toRefs(props);

const network = computed(() => getNetwork(props.proposal.network));

function reset() {
  votes.value = [];
  loaded.value = false;
  loadingMore.value = false;
  hasMore.value = false;
}

async function loadVotes() {
  votes.value = await network.value.api.loadProposalVotes(props.proposal, { limit: LIMIT });
  hasMore.value = votes.value.length >= LIMIT;
  loaded.value = true;
}

async function handleEndReached() {
  if (loadingMore.value || !hasMore.value) return;

  loadingMore.value = true;
  const newVotes = await network.value.api.loadProposalVotes(props.proposal, {
    limit: LIMIT,
    skip: votes.value.length
  });
  hasMore.value = newVotes.length >= LIMIT;
  votes.value = [...votes.value, ...newVotes];
  loadingMore.value = false;
}

const isEncrypted = computed(() => {
  return !!props.proposal.privacy && !props.proposal.completed;
});

watch([open, () => props.proposal.id], ([toOpen, toId], [, fromId]) => {
  if (toOpen === false) return;
  if (loaded.value && toId === fromId) return;

  loadVotes();
});

onMounted(() => {
  if (!open.value) return;

  loadVotes();
});

watch(
  () => props.proposal.id,
  (toId, fromId) => {
    if (toId === fromId) return;

    reset();
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Votes'" />
    </template>
    <UiLoading v-if="!loaded" class="p-4 block text-center" />
    <div v-else>
      <div v-if="votes.length > 0">
        <UiContainerInfiniteScroll :loading-more="loadingMore" @end-reached="handleEndReached">
          <div
            v-for="(vote, i) in votes"
            :key="i"
            class="py-3 px-4 border-b relative flex gap-2"
            :class="{ 'last:border-b-0': !loadingMore }"
          >
            <div
              v-if="!isEncrypted"
              class="absolute top-0 bottom-0 right-0 z-[-1]"
              :style="{
                width: `${((100 / proposal.scores_total) * vote.vp).toFixed(2)}%`
              }"
              :class="
                proposal.type === 'basic'
                  ? `choice-bg opacity-10 _${vote.choice}`
                  : 'bg-skin-border opacity-40'
              "
            />
            <UiStamp :id="vote.voter.id" :size="24" />
            <router-link
              :to="{
                name: 'user',
                params: {
                  id: vote.voter.id
                }
              }"
              class="grow"
              @click="$emit('close')"
            >
              {{ vote.voter.name || shortenAddress(vote.voter.id) }}
            </router-link>

            <template v-if="isEncrypted">
              <div class="flex gap-1 items-center">
                <span class="text-skin-heading">Encrypted choice</span>
                <IH-lock-closed class="w-[16px] h-[16px] shrink-0" />
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
      </div>
      <div v-else class="p-4 text-center">There isn't any votes yet!</div>
    </div>
  </UiModal>
</template>
