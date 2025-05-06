<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { LocationQueryValue } from 'vue-router';
import { getChoiceText, getFormattedVotingPower } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { getNetwork, offchainNetworks } from '@/networks';
import { PROPOSALS_KEYS } from '@/queries/proposals';
import { useProposalVotingPowerQuery } from '@/queries/votingPower';
import { Choice, Proposal } from '@/types';

const REASON_DEFINITION = {
  title: 'Reason',
  type: 'string',
  format: 'long',
  examples: ['Share you reason (optional)'],
  maxLength: 5000
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

const queryClient = useQueryClient();
const { vote } = useActions();
const { web3 } = useWeb3();
const { loadVotes, votes } = useAccount();
const route = useRoute();
const {
  data: votingPower,
  isPending: isVotingPowerPending,
  isError: isVotingPowerError,
  refetch: fetchVotingPower
} = useProposalVotingPowerQuery(
  toRef(() => web3.value.account),
  toRef(props, 'proposal'),
  toRef(props, 'open')
);

const loading = ref(false);
const hidden = ref(false);
const form = ref<Record<string, string>>({ reason: '' });
const formErrors = ref({} as Record<string, any>);
const formValidated = ref(false);
const modalTransactionOpen = ref(false);
const modalShareOpen = ref(false);
const txId = ref<string | null>(null);
const selectedChoice = ref<Choice | null>(null);

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

const offchainProposal = computed<boolean>(() =>
  offchainNetworks.includes(props.proposal.network)
);

const canSubmit = computed<boolean>(
  () =>
    formValidated.value &&
    !!props.choice &&
    Object.keys(formErrors.value).length === 0 &&
    !!votingPower.value?.canVote
);

async function handleSubmit() {
  loading.value = true;
  selectedChoice.value = props.choice;

  if (offchainProposal.value) {
    try {
      await voteFn();
      handleConfirmed();
    } catch {
    } finally {
      loading.value = false;
    }
  } else {
    hidden.value = true;
    modalTransactionOpen.value = true;
  }
}

async function voteFn() {
  if (!selectedChoice.value) return null;

  const appName = (route.query.app as LocationQueryValue) || '';

  return vote(
    props.proposal,
    selectedChoice.value,
    form.value.reason,
    appName.length <= 128 ? appName : ''
  );
}

async function handleConfirmed(tx?: string | null) {
  modalTransactionOpen.value = false;
  if (tx) {
    txId.value = tx;
  }

  emit('voted');
  emit('close');

  modalShareOpen.value = true;
  hidden.value = false;
  loading.value = false;

  // TODO: Quick fix only for offchain proposals, need a more complete solution for onchain proposals
  if (offchainProposal.value) {
    queryClient.invalidateQueries({
      queryKey: PROPOSALS_KEYS.detail(
        props.proposal.network,
        props.proposal.space.id,
        props.proposal.proposal_id.toString()
      )
    });
    queryClient.invalidateQueries({
      queryKey: ['votes', props.proposal.proposal_id.toString(), 'list']
    });
    await loadVotes(props.proposal.network, [props.proposal.space.id]);
  }
}

function handleCancelled() {
  modalTransactionOpen.value = false;
  loading.value = false;
  hidden.value = false;
}

watch(
  [() => props.open, () => web3.value.account],
  async ([open, toAccount], [, fromAccount]) => {
    if (!open) return;

    if (fromAccount && toAccount && fromAccount !== toAccount) {
      loading.value = true;
      form.value.reason = '';
      await loadVotes(props.proposal.network, [props.proposal.space.id]);
    }

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
  <UiModal :open="open" :class="{ hidden }" @close="$emit('close')">
    <template #header>
      <h3>Cast your vote</h3>
    </template>
    <div class="m-4 mb-3 flex flex-col space-y-3">
      <MessageErrorFetchPower
        v-if="isVotingPowerError"
        type="voting"
        @fetch="fetchVotingPower"
      />
      <MessageVotingPower
        v-else-if="votingPower && !votingPower.canVote"
        :voting-power="votingPower"
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
        <dd v-if="isVotingPowerPending">
          <UiLoading />
        </dd>
        <dd
          v-else-if="votingPower"
          class="font-semibold text-skin-heading text-[20px] leading-6"
          v-text="formattedVotingPower"
        />
      </dl>
      <div v-if="proposal.privacy === 'none'" class="s-box">
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
      :open="modalTransactionOpen"
      :chain-id="getNetwork(props.proposal.network).chainId"
      :messages="{
        approveTitle: 'Confirm vote'
      }"
      :execute="voteFn"
      @confirmed="handleConfirmed"
      @cancelled="handleCancelled"
      @close="modalTransactionOpen = false"
    />
    <ModalShare
      :open="modalShareOpen"
      :tx-id="txId"
      :show-icon="true"
      :shareable="{ proposal, choice: selectedChoice! }"
      :messages="{
        title: 'Vote success!'
      }"
      @close="modalShareOpen = false"
    />
  </teleport>
</template>
