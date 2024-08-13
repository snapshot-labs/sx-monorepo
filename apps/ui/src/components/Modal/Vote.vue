<script setup lang="ts">
import { getChoiceText, getFormattedVotingPower } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { offchainNetworks } from '@/networks';
import { Choice, Proposal } from '@/types';

const REASON_DEFINITION = {
  title: 'Reason',
  type: 'string',
  format: 'long',
  examples: ['Share you reason (optional)'],
  maxLength: 1000
};

const props = defineProps<{
  proposal: Proposal;
  choice: Choice | null;
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close');
  (e: 'voted');
}>();

const { vote } = useActions();
const { web3 } = useWeb3();
const {
  votingPower,
  fetch: fetchVotingPower,
  reset: resetVotingPower
} = useVotingPower();
const proposalsStore = useProposalsStore();
const { loadVotes, votes } = useAccount();

const loading = ref(false);
const form = ref<Record<string, string>>({ reason: '' });
const formErrors = ref({} as Record<string, any>);
const formValidated = ref(false);
const saving = ref(false);

const formValidator = getValidator({
  $async: true,
  type: 'object',
  title: 'Reason',
  additionalProperties: false,
  required: [],
  properties: {
    reason: REASON_DEFINITION
  }
});

const formattedVotingPower = computed(() =>
  getFormattedVotingPower(votingPower.value)
);

const canSubmit = computed(
  () =>
    formValidated &&
    !!props.choice &&
    Object.keys(formErrors.value).length === 0 &&
    votingPower.value?.canVote
);

async function handleSubmit() {
  loading.value = true;

  if (offchainNetworks.includes(props.proposal.network)) {
    try {
      await voteFn();
      handleConfirmed();
    } finally {
      loading.value = false;
    }
  } else {
    emit('close');
    loading.value = false;
    saving.value = true;
  }
}

async function voteFn() {
  if (!props.choice) return null;

  return vote(props.proposal, props.choice, form.value.reason);
}

async function handleConfirmed() {
  emit('voted');
  emit('close');
  saving.value = false;
  loading.value = false;

  // TODO: Quick fix only for offchain proposals, need a more complete solution for onchain proposals
  if (offchainNetworks.includes(props.proposal.network)) {
    proposalsStore.fetchProposal(
      props.proposal.space.id,
      props.proposal.id,
      props.proposal.network
    );
    await loadVotes(props.proposal.network, [props.proposal.space.id]);
  }
}

function handleFetchVotingPower() {
  fetchVotingPower(props.proposal);
}

watch(
  [() => props.open, () => web3.value.account],
  async ([open, toAccount], [, fromAccount]) => {
    if (!open) return;

    if (fromAccount && toAccount && fromAccount !== toAccount) {
      loading.value = true;
      resetVotingPower();
      form.value.reason = '';
      await loadVotes(props.proposal.network, [props.proposal.space.id]);
    }

    handleFetchVotingPower();

    form.value.reason =
      votes.value[`${props.proposal.network}:${props.proposal.id}`]?.reason ||
      '';

    loading.value = false;
  },
  { immediate: true }
);

watchEffect(async () => {
  formValidated.value = false;

  formErrors.value = await formValidator.validateAsync(form.value);
  formValidated.value = true;
});
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3>Cast your vote</h3>
    </template>
    <div class="m-4 mb-3 flex flex-col space-y-3">
      <MessageVotingPower
        v-if="votingPower"
        :voting-power="votingPower"
        action="vote"
        @fetch-voting-power="handleFetchVotingPower"
      />
      <dl>
        <dt class="text-sm leading-5">Choice</dt>
        <dd class="text-skin-heading text-[20px] leading-6">
          <span
            v-if="choice"
            class="test-skin-heading font-semibold"
            v-text="getChoiceText(proposal.choices, choice)"
          />
          <div v-else class="flex gap-1 text-skin-danger items-center">
            <IH-exclamation-circle />
            No choice selected
          </div>
        </dd>
        <dt class="text-sm leading-5 mt-3">Voting power</dt>
        <dd v-if="!votingPower || votingPower.status === 'loading'">
          <UiLoading />
        </dd>
        <dd
          v-else-if="votingPower.status === 'success'"
          class="font-semibold text-skin-heading text-[20px] leading-6"
          v-text="formattedVotingPower"
        />
        <dd
          v-else-if="votingPower.status === 'error'"
          class="font-semibold text-skin-heading text-[20px] leading-6"
          v-text="formattedVotingPower"
        />
      </dl>
      <div class="s-box">
        <UiForm
          v-model="form"
          :error="formErrors"
          :definition="{ properties: { reason: REASON_DEFINITION } }"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col xs:flex-row gap-3">
        <UiButton
          class="w-full order-last xs:order-none"
          @click="$emit('close')"
        >
          Cancel
        </UiButton>
        <UiButton
          primary
          class="w-full"
          :disabled="!canSubmit"
          :loading="loading"
          @click="handleSubmit"
        >
          Confirm
        </UiButton>
      </div>
    </template>
  </UiModal>

  <teleport to="#modal">
    <ModalTransactionProgress
      :open="saving"
      :network-id="proposal.network"
      :messages="{
        approveTitle: 'Confirm your vote',
        successTitle: 'Done!',
        successSubtitle: 'Your vote is in!'
      }"
      :execute="voteFn"
      @confirmed="handleConfirmed"
      @close="saving = false"
    />
  </teleport>
</template>
