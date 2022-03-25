<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { _rt, _n, shortenAddress } from '@/helpers/utils';
import apollo from '@/helpers/apollo';
import { PROPOSAL_QUERY } from '@/helpers/queries';
import { useActions } from '@/composables/useActions';

const route = useRoute();
const { vote } = useActions();
const id = parseInt(route.params.id || 0);
const space = route.params.space;
const proposal = ref({});
const loaded = ref(false);
const modalOpen = ref(false);

onMounted(async () => {
  const { data } = await apollo.query({
    query: PROPOSAL_QUERY,
    variables: { id: `${space}/${id}` }
  });
  proposal.value = data.proposal;
  loaded.value = true;
});
</script>

<template>
  <div>
    <Container v-if="!loaded" class="pt-5">
      <UiLoading />
    </Container>
    <div v-else>
      <Container class="pt-5">
        <h1 class="mb-3">
          {{ proposal.title || `Proposal #${proposal.proposal_id}` }}
        </h1>
        <div class="flex mb-4 items-center">
          <div class="flex-auto space-x-2">
            <router-link
              :to="{
                name: 'user',
                params: { id: proposal.author }
              }"
            >
              <Stamp :id="proposal.author" :size="24" class="mr-1" />
              {{ shortenAddress(proposal.author) }}
            </router-link>
            <span class="text-skin-text">· {{ _rt(proposal.created) }}</span>
          </div>
          <UiButton class="!w-[46px] !h-[46px] !p-0">
            <Icon name="threedots" size="20" />
          </UiButton>
        </div>
        <div v-if="proposal.body" class="mb-4">
          <p v-text="proposal.body" />
        </div>
      </Container>
      <Container slim>
        <div class="x-block mb-5">
          <Execution />
        </div>
        <a
          v-if="proposal.discussion"
          :href="proposal.discussion"
          target="_blank"
          class="x-block block mb-5"
        >
          <h4 class="px-4 py-3">
            <Icon name="receipt-outlined" class="mr-2" /> Discussion
            <span class="float-right"><Icon name="external-link" /></span>
          </h4>
        </a>
      </Container>
      <Container>
        <div class="mb-4">
          <div class="grid grid-cols-3 gap-2 mb-3">
            <UiButton
              @click="vote(space, proposal.proposal_id, 1)"
              class="w-full !text-white !bg-green !border-green"
            >
              <Icon name="check3" size="20" />
            </UiButton>
            <UiButton
              @click="vote(space, proposal.proposal_id, 2)"
              class="w-full !text-white !bg-red !border-red"
            >
              <Icon name="close2" size="20" />
            </UiButton>
            <UiButton
              @click="vote(space, proposal.proposal_id, 3)"
              class="w-full !text-white !bg-gray-500 !border-gray-500"
            >
              <Icon name="skip" size="20" />
            </UiButton>
          </div>
          <div class="mb-4">
            <a @click="modalOpen = true" class="text-skin-text">
              {{ _n(proposal.vote_count) }} votes
            </a>
            · {{ _rt(proposal.end) }}
          </div>
        </div>
      </Container>
    </div>
    <teleport to="#modal">
      <ModalVotes
        :open="modalOpen"
        :proposal="proposal"
        @close="modalOpen = false"
      />
    </teleport>
  </div>
</template>
