<script setup lang="ts">
import { getChoiceText, getFormattedVotingPower } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
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

const loading = ref(false);
const form = ref<Record<string, string>>({ reason: '' });
const formErrors = ref({} as Record<string, any>);
const formValidated = ref(false);

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

  if (!props.choice) return;

  try {
    await vote(props.proposal, props.choice, form.value.reason);
    emit('voted');
    emit('close');
  } finally {
    loading.value = false;
  }
}

function handleFetchVotingPower() {
  fetchVotingPower(props.proposal);
}

watch(
  [() => props.open, () => web3.value.account],
  ([open, toAccount], [, fromAccount]) => {
    if (fromAccount && toAccount && fromAccount !== toAccount) {
      resetVotingPower();
    }

    if (open) handleFetchVotingPower();
  },
  { immediate: true }
);

watch(
  () => props.proposal,
  (toProposal, fromProposal) => {
    if (props.open && fromProposal?.id !== toProposal.id) {
      emit('close');
    }
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
</template>
