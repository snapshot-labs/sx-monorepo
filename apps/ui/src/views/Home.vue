<script setup>
import { ref } from 'vue';
import client from '@/helpers/client';
import { useWeb3 } from '@/composables/useWeb3';
import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import proposalSchema from '@/helpers/x/schemas/proposal.json';
import voteSchema from '@/helpers/x/schemas/vote.json';

const proposalDef = proposalSchema.definitions.Proposal;
const voteDef = voteSchema.definitions.Vote;

const { web3 } = useWeb3();
const auth = getInstance();

const inputProposal = ref({
  executionHash:
    '0x8f974b76d4f50ea26a1f44843dcda2e0f6a4736883968b29996d272b86b447a9',
  metadataHash:
    '0x8f974b76d4f50ea26a1f44843dcda2e0f6a4736883968b29996d272b86b447a9'
});

const inputVote = ref({
  proposal:
    '0x8f974b76d4f50ea26a1f44843dcda2e0f6a4736883968b29996d272b86b447a9',
  choice: 1
});

async function proposal() {
  const receipt = await client.proposal(
    auth.web3,
    web3.value.account,
    inputProposal.value
  );
  console.log('Receipt', receipt);
}

async function vote() {
  const receipt = await client.vote(
    auth.web3,
    web3.value.account,
    inputVote.value
  );
  console.log('Receipt', receipt);
}
</script>

<template>
  <Layout>
    <h1 class="mb-3">Playground</h1>
    <div class="mb-5 max-w-md">
      <h3>Create proposal</h3>
      <SIObject v-model="inputProposal" :definition="proposalDef" />
      <UiButton @click="proposal" class="mr-2">Submit</UiButton>
    </div>
    <div class="mb-5 max-w-md">
      <h3>Cast vote</h3>
      <SIObject v-model="inputVote" :definition="voteDef" />
      <UiButton @click="vote" class="mr-2">Submit</UiButton>
    </div>
  </Layout>
</template>
