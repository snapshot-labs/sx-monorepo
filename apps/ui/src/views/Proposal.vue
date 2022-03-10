<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import client from '@/helpers/client';
import { useWeb3 } from '@/composables/useWeb3';
import { useTxStatus } from '@/composables/useTxStatus';
import { _rt, _n, shortenAddress } from '@/helpers/utils';
import apollo from '@/helpers/apollo';
import { PROPOSAL_QUERY } from '@/helpers/queries';

const { web3 } = useWeb3();
const auth = getInstance();
const { pendingCount } = useTxStatus();
const route = useRoute();

const id = route.params.id || 0;

const proposal = ref({});
const loaded = ref(false);

async function vote(choice) {
  const envelop = await client.vote(auth.web3, web3.value.account, {
    proposal: id,
    choice
  });
  console.log('Envelop', envelop);
  pendingCount.value++;
  const receipt = await client.send(envelop);
  pendingCount.value--;
  console.log('Receipt', receipt);
}

onMounted(async () => {
  const { data } = await apollo.query({
    query: PROPOSAL_QUERY,
    variables: { id }
  });
  proposal.value = data.proposal;
  loaded.value = true;
});
</script>

<template>
  <Container v-if="!loaded" class="pt-5">
    <UiLoading />
  </Container>
  <div v-else>
    <Container class="pt-5">
      <h1 class="mb-3">
        {{ proposal.title || `Proposal #${id.slice(0, 7)}` }}
      </h1>
      <div class="flex mb-4 items-center">
        <div class="flex-auto">
          <Stamp
            id="0xeF8305E140ac520225DAf050e2f71d5fBcC543e7"
            :size="24"
            class="float-left mr-2"
          />
          <span>
            {{ shortenAddress(proposal.author) }}
            <span class="text-skin-text">· {{ _rt(proposal.created) }}</span>
          </span>
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
      <div class="x-block mb-5">
        <h4 class="px-4 py-3">
          <Icon name="receipt-outlined" class="mr-2" /> Discussion
          <span class="float-right"><Icon name="external-link" /></span>
        </h4>
      </div>
    </Container>
    <Container>
      <div class="mb-4">
        <div class="grid grid-cols-3 gap-2 mb-3">
          <UiButton
            @click="vote(1)"
            class="w-full !text-white !bg-green !border-green"
          >
            <Icon name="check3" size="20" />
          </UiButton>
          <UiButton
            @click="vote(2)"
            class="w-full !text-white !bg-red !border-red"
          >
            <Icon name="close2" size="20" />
          </UiButton>
          <UiButton
            @click="vote(3)"
            class="w-full !text-white !bg-gray-500 !border-gray-500"
          >
            <Icon name="skip" size="20" />
          </UiButton>
        </div>
        <div class="mb-4">
          {{ _n(proposal.vote_count) }} votes · {{ _rt(proposal.end) }}
        </div>
      </div>
    </Container>
  </div>
</template>
