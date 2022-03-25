<script setup>
import { ref, toRefs, watch } from 'vue';
import apollo from '@/helpers/apollo';
import { VOTES_QUERY } from '@/helpers/queries';
import { shortenAddress } from '@/helpers/utils';
import choices from '@/helpers/choices.json';

const props = defineProps({
  open: Boolean,
  proposal: Object
});

defineEmits(['close']);

const votes = ref([]);
const loaded = ref(false);
const { open } = toRefs(props);

watch(open, async () => {
  if (open.value === false) return;
  console.log('Get votes');
  const { data } = await apollo.query({
    query: VOTES_QUERY,
    variables: {
      space: props.proposal.space,
      proposal: props.proposal.proposal_id
    }
  });
  votes.value = data.votes;
  loaded.value = true;
});
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template v-slot:header>
      <h3 v-text="'Votes'" />
    </template>
    <UiLoading v-if="!loaded" class="p-4 block text-center" />
    <div v-else>
      <div
        v-for="(vote, i) in votes"
        :key="i"
        class="py-3 px-4 border-b last:border-b-0"
      >
        <Stamp :id="vote.voter" :size="24" class="mr-2" />
        {{ shortenAddress(vote.voter) }}
        {{ vote.vp }}
        <div v-text="choices[vote.choice]" class="float-right" />
      </div>
    </div>
  </UiModal>
</template>
