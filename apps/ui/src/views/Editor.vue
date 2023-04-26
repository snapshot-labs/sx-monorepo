<script setup lang="ts">
import { useSpacesStore } from '@/stores/spaces';
import { getNetwork } from '@/networks';
import { omit, shortenAddress } from '@/helpers/utils';
import { NetworkID, SelectedStrategy } from '@/types';

const { proposals, createDraft } = useEditor();
const { modalOpen: globalModalOpen } = useModal();
const route = useRoute();
const router = useRouter();
const { propose, updateProposal } = useActions();
const { web3 } = useWeb3();
const spacesStore = useSpacesStore();

const id = route.params.id as string;
const [networkId, spaceId] = id.split(':');
const key = route.params.key as string;
const proposalKey = `${id}:${key}`;

const modalOpen = ref(false);
const previewEnabled = ref(false);
const sending = ref(false);
const fetchingVotingPower = ref(true);
const votingPowerValid = ref(false);

const network = computed(() => getNetwork(networkId as NetworkID));
const space = computed(() => spacesStore.spacesMap.get(id));
const supportedExecutionStrategies = computed(() => {
  const spaceValue = space.value;
  if (!spaceValue) return null;

  return spaceValue.executors.filter(
    (_, i) => network.value.constants.SUPPORTED_EXECUTORS[spaceValue.executors_types[i]]
  );
});
const executionStrategy = computed({
  get() {
    return proposals[proposalKey].executionStrategy;
  },
  set(value: SelectedStrategy | null) {
    proposals[proposalKey].executionStrategy = value;
  }
});
const proposalData = computed(() => {
  if (!proposals[proposalKey]) return null;

  return JSON.stringify(omit(proposals[proposalKey], ['updatedAt']));
});

if (!proposals[proposalKey]) {
  createDraft(id, { id: key });
}

async function handleProposeClick() {
  const proposal = proposals[proposalKey];
  if (!space.value || !proposal?.executionStrategy) return;

  sending.value = true;

  try {
    let result;
    if (proposal.proposalId) {
      result = await updateProposal(
        space.value,
        proposal.proposalId,
        proposal.title,
        proposal.body,
        proposal.discussion,
        proposal.executionStrategy.address,
        proposal.execution
      );
    } else {
      result = await propose(
        space.value,
        proposal.title,
        proposal.body,
        proposal.discussion,
        proposal.executionStrategy.address,
        proposal.execution
      );
    }
    if (result) router.back();
  } finally {
    sending.value = false;
  }
}

async function getVotingPower() {
  if (!space.value || !web3.value.account) return;

  fetchingVotingPower.value = true;
  try {
    const network = getNetwork(space.value.network);

    const votingPowers = await network.actions.getVotingPower(
      space.value.voting_power_validation_strategy_strategies,
      space.value.voting_power_validation_strategy_strategies_params,
      [],
      web3.value.account,
      Math.floor(Date.now() / 1000)
    );

    const currentVotingPower = votingPowers.reduce((a, b) => a + b.value, 0n);
    votingPowerValid.value = currentVotingPower >= BigInt(space.value.proposal_threshold);
  } catch (err) {
    console.warn('err', err);
  } finally {
    fetchingVotingPower.value = false;
  }
}

onMounted(() => {
  spacesStore.fetchSpace(spaceId, networkId as NetworkID);

  if (!key && route.name) {
    globalModalOpen.value = false;

    const draftId = createDraft(id);

    router.replace({
      name: route.name,
      params: { id, key: draftId }
    });
  }
});

watch([space, () => web3.value.account], () => getVotingPower());

watch(
  () => proposals[proposalKey],
  (to, from) => {
    if (from && !to) {
      router.replace({ name: 'editor' });
    }
  }
);

watch(proposalData, () => {
  if (!proposals[proposalKey]) return;

  proposals[proposalKey].updatedAt = Date.now();
});
</script>
<template>
  <div>
    <nav class="border-b bg-skin-bg fixed top-0 z-50 right-0 left-0 lg:left-[72px]">
      <div class="flex items-center h-[71px] mx-4">
        <div class="flex-auto space-x-2">
          <router-link :to="{ name: 'space-overview', params: { id } }" class="mr-2">
            <UiButton class="leading-3 w-[46px] !px-0">
              <IH-arrow-narrow-left class="inline-block" />
            </UiButton>
          </router-link>
          <h4 class="py-2 inline-block">New proposal</h4>
        </div>
        <PendingTransactionsIndicator class="mr-2" />
        <UiLoading v-if="!space" class="block p-4" />
        <div v-else class="space-x-2">
          <UiButton class="float-left leading-3 !px-3 rounded-r-none" @click="modalOpen = true">
            <IH-collection class="inline-block" />
          </UiButton>
          <UiButton
            class="rounded-l-none border-l-0 float-left !m-0 !px-3"
            :loading="sending || (web3.account !== '' && fetchingVotingPower)"
            :disabled="
              (!fetchingVotingPower && !votingPowerValid) ||
              !proposals[proposalKey]?.executionStrategy
            "
            @click="handleProposeClick"
          >
            <span
              class="hidden mr-2 md:inline-block"
              v-text="proposals[proposalKey].proposalId ? 'Update' : 'Publish'"
            />
            <IH-paper-airplane class="inline-block rotate-90" />
          </UiButton>
        </div>
      </div>
    </nav>
    <Container v-if="proposals[proposalKey]" class="pt-5 s-box">
      <UiAlert v-if="!fetchingVotingPower && !votingPowerValid" type="error" class="mb-4">
        You do not have enough voting power to create proposal in this space.
      </UiAlert>
      <h4 class="eyebrow mb-3">Context</h4>
      <SIString
        v-model="proposals[proposalKey].title"
        :definition="{
          type: 'string',
          title: 'Title'
        }"
      />
      <div class="flex">
        <Link
          :is-active="!previewEnabled"
          text="Editor"
          class="pr-3"
          @click="previewEnabled = false"
        />
        <Link :is-active="previewEnabled" text="Preview" @click="previewEnabled = true" />
      </div>
      <Markdown
        v-if="previewEnabled"
        class="px-3 py-2 border rounded-lg mb-5 min-h-[200px]"
        :body="proposals[proposalKey].body"
      />

      <div v-else class="s-base mb-3">
        <div class="s-label" v-text="'Description'" />
        <textarea
          v-model="proposals[proposalKey].body"
          maxlength="9600"
          class="s-input mb-3 h-[160px]"
        />
        <SIString
          v-model="proposals[proposalKey].discussion"
          :definition="{
            type: 'string',
            title: 'Discussion',
            examples: ['e.g. https://forum.balancer.fi/t/proposal…']
          }"
        />
        <Preview :url="proposals[proposalKey].discussion" />
      </div>
      <div v-if="space">
        <h4 class="eyebrow mb-3">Execution</h4>
        <div class="flex flex-col gap-2 mb-3">
          <div v-if="supportedExecutionStrategies && !supportedExecutionStrategies.length">
            No supported execution strategies available.
          </div>
          <ExecutionButton
            v-for="(executor, i) in supportedExecutionStrategies"
            :key="executor"
            class="flex-auto flex items-center gap-2"
            :class="{
              'border-skin-link': executionStrategy?.address === executor,
              'text-skin-border': executionStrategy?.address !== executor
            }"
            @click="
              executionStrategy = {
                address: executor,
                type: space.executors_types[i]
              }
            "
          >
            <IH-cog />
            {{ network.constants.EXECUTORS[space.executors_types[i]] }} execution strategy ({{
              shortenAddress(executor)
            }})
          </ExecutionButton>
        </div>
        <BlockExecutionEditable
          v-if="executionStrategy"
          v-model="proposals[proposalKey].execution"
          :selected-execution-strategy="executionStrategy"
          :space="space"
          class="mb-4"
        />
      </div>
    </Container>
    <teleport to="#modal">
      <ModalDrafts
        :open="modalOpen"
        :network-id="networkId"
        :space="spaceId"
        @close="modalOpen = false"
      />
    </teleport>
  </div>
</template>
