<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { useWeb3 } from '@/composables/useWeb3';
import { useProposalsStore } from '@/stores/proposals';
import { getNetwork } from '@/networks';
import { _n } from '@/helpers/utils';
import type { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const auth = getInstance();
const { web3 } = useWeb3();
const proposalsStore = useProposalsStore();

const votingPower = ref(0n);
const loadingVotingPower = ref(true);

const proposalsRecord = computed(
  () => proposalsStore.proposals[`${props.space.network}:${props.space.id}`]
);

async function handleEndReached() {
  if (!proposalsRecord.value?.hasMoreProposals) return;

  proposalsStore.fetchMore(props.space.id, props.space.network);
}

async function getVotingPower() {
  const network = getNetwork(props.space.network);

  if (!web3.value.account) {
    votingPower.value = 0n;
    loadingVotingPower.value = false;
    return;
  }

  loadingVotingPower.value = true;
  try {
    votingPower.value = await network.actions.getVotingPower(
      auth.web3,
      props.space.strategies,
      props.space.strategies_params,
      web3.value.account,
      Math.floor(Date.now() / 1000)
    );
  } catch (err) {
    console.warn('err', err);
    votingPower.value = 0n;
  } finally {
    loadingVotingPower.value = false;
  }
}

onMounted(() => {
  proposalsStore.fetch(props.space.id, props.space.network);

  getVotingPower();
});

watch(
  () => web3.value.account,
  () => getVotingPower()
);
</script>

<template>
  <div>
    <div class="flex">
      <div class="flex-auto" />
      <div class="p-4 space-x-2">
        <UiButton
          v-if="web3.account && web3.type !== 'argentx'"
          :loading="loadingVotingPower"
          :class="{
            '!px-0 w-[46px]': loadingVotingPower
          }"
        >
          <IH-lightning-bolt class="inline-block" />
          <span class="ml-1">{{ _n(votingPower, 'compact') }}</span>
        </UiButton>
        <router-link :to="{ name: 'editor' }">
          <UiButton class="!px-0 w-[46px]">
            <IH-pencil-alt class="inline-block" />
          </UiButton>
        </router-link>
      </div>
    </div>
    <ProposalsList
      title="Proposals"
      limit="off"
      :loading="!proposalsRecord?.loaded"
      :loading-more="proposalsRecord?.loadingMore"
      :proposals="proposalsStore.getSpaceProposals(props.space.id, props.space.network)"
      @end-reached="handleEndReached"
    />
  </div>
</template>
