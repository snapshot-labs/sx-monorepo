<script setup lang="ts">
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { useQueryClient } from '@tanstack/vue-query';
import { LocationQueryValue } from 'vue-router';
import { _n, getChoiceText, getFormattedVotingPower } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { getNetwork, offchainNetworks, starknetNetworks } from '@/networks';
import { EVM_CONNECTORS } from '@/networks/common/constants';
import { PROPOSALS_KEYS } from '@/queries/proposals';
import { useVoteValidationPowerQuery } from '@/queries/voteValidationPower';
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
  (e: 'close'): void;
  (e: 'voted'): void;
}>();

const queryClient = useQueryClient();
const { vote } = useActions();
const { web3, auth } = useWeb3();
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
const {
  data: voteValidationPower,
  isPending: isVoteValidationPowerPending,
  isError: isVoteValidationPowerError,
  refetch: fetchVoteValidationPower
} = useVoteValidationPowerQuery(
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
const isTxPreferred = ref(false);
const isAdvancedOpen = ref(false);

const canVoteViaTx = computed<boolean>(() => {
  const connectorType = auth.value?.connector.type;
  if (
    !isStarknetProposal.value ||
    !connectorType ||
    !EVM_CONNECTORS.includes(connectorType)
  ) {
    return false;
  }

  const { helpers } = getNetwork(props.proposal.network);
  return props.proposal.space.authenticators.some(
    a => helpers.getAuthenticatorSupportInfo(a)?.relayerType === 'evm-tx'
  );
});

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

const blockExplorerUrl = computed(() => {
  const chainId =
    props.proposal.space.snapshot_chain_id ||
    getNetwork(props.proposal.network).currentChainId.toString();
  const snapshot = props.proposal.snapshot;

  if (!snapshot || !chainId) return null;

  const network = networks[chainId];

  return network?.explorer?.url
    ? `${network.explorer.url}/block/${snapshot}`
    : null;
});

const offchainProposal = computed<boolean>(() =>
  offchainNetworks.includes(props.proposal.network)
);

const isStarknetProposal = computed<boolean>(() =>
  starknetNetworks.includes(props.proposal.network)
);

const canSubmit = computed<boolean>(
  () =>
    formValidated.value &&
    !!props.choice &&
    Object.keys(formErrors.value).length === 0 &&
    !!voteValidationPower.value?.canVote &&
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
    appName.length <= 128 ? appName : '',
    isTxPreferred.value
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

    isTxPreferred.value = false;
    isAdvancedOpen.value = false;

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
  <UiModal :open="open" :class="{ hidden }" @close="emit('close')">
    <template #header>
      <h3>Cast your vote</h3>
    </template>
    <div class="m-4 mb-3 flex flex-col space-y-3">
      <MessageErrorFetchPower
        v-if="isVoteValidationPowerError"
        type="vote-validation"
        @fetch="fetchVoteValidationPower"
      />
      <MessagePropositionPower
        v-else-if="voteValidationPower && !voteValidationPower.canVote"
        :proposition-power="voteValidationPower"
      />
      <MessageErrorFetchPower
        v-else-if="voteValidationPower?.canVote && isVotingPowerError"
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
          class="font-semibold text-skin-heading text-[20px] leading-6 flex gap-1.5"
        >
          {{ formattedVotingPower }}
          <span
            v-if="!isStarknetProposal && proposal.snapshot && blockExplorerUrl"
            class="font-normal flex gap-0.5 text-sm items-center"
          >
            (
            <AppLink :to="blockExplorerUrl">{{
              _n(proposal.snapshot)
            }}</AppLink>
            <UiTooltip title="Snapshot block number">
              <IH-information-circle class="size-3" />
            </UiTooltip>
            )
          </span>
        </dd>
      </dl>
      <div v-if="proposal.privacy === 'none'" class="s-box">
        <UiForm
          v-model="form"
          :error="formErrors"
          :definition="{ properties: { reason: REASON_DEFINITION } }"
        />
      </div>
      <div v-if="canVoteViaTx">
        <button
          type="button"
          class="flex items-center gap-1 text-skin-text text-sm"
          @click="isAdvancedOpen = !isAdvancedOpen"
        >
          Advanced
          <IH-chevron-down
            class="w-[14px] h-[14px] transition-transform"
            :class="{ 'rotate-180': isAdvancedOpen }"
          />
        </button>
        <div
          class="grid transition-all duration-200"
          :class="isAdvancedOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
        >
          <div class="overflow-hidden">
            <label
              class="flex gap-2.5 items-start cursor-pointer border rounded-lg p-3 mt-2"
            >
              <input v-model="isTxPreferred" type="checkbox" class="mt-[3px]" />
              <span class="leading-5 block space-y-1">
                <span class="block text-skin-link">Vote with a transaction</span>
                <span class="block text-sm text-skin-text">
For Ledger / hardware wallets. Sends an on-chain Ethereum
transaction instead of a signature. Use this if signing fails on a
Ledger or other hardware wallet. This costs gas.
                </span>
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col xs:flex-row gap-3">
        <UiButton
          class="w-full order-last xs:order-none"
          @click="emit('close')"
        >
          Cancel
        </UiButton>
        <UiButton
          primary
          class="w-full"
          :disabled="!canSubmit"
          :loading="isVoteValidationPowerPending || loading"
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
      :wait-for-index="!offchainProposal"
      @confirmed="handleConfirmed"
      @cancelled="handleCancelled"
      @close="modalTransactionOpen = false"
    />
    <ModalShare
      :open="modalShareOpen"
      :tx-id="txId"
      :show-icon="true"
      :shareable="{ proposal, choice: selectedChoice! }"
      :network="proposal.network"
      :messages="{
        title: 'Vote success!'
      }"
      :type="'vote'"
      @close="modalShareOpen = false"
    />
  </teleport>
</template>
