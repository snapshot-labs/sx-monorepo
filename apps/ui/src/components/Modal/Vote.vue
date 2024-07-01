<script setup lang="ts">
import { getChoiceText, getFormattedVotingPower } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import type { Choice, Proposal } from '@/types';

const definition = {
  type: 'object',
  title: 'Vote',
  additionalProperties: false,
  required: [],
  properties: {
    reason: {
      title: 'Reason',
      type: 'string',
      format: 'long',
      examples: ['Share you reason (optional)'],
      maxLength: 1000
    }
  }
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
  reset: resetVotingPower,
  hasVoteVp
} = useVotingPower();

const loading = ref(false);
const form = ref<Record<string, string>>({ reason: '' });

const formErrors = computed(() =>
  validateForm(definition, form.value, { skipEmptyOptionalFields: true })
);
const formattedVotingPower = computed(() => getFormattedVotingPower(votingPower.value));

const canSubmit = computed(
  () => !!props.choice && Object.keys(formErrors.value).length === 0 && hasVoteVp.value
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
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3>Cast your vote</h3>
    </template>

    <div class="m-4 flex flex-col space-y-3">
      <MessageVotingPower
        v-if="votingPower"
        :voting-power="votingPower"
        :min-voting-power="0n"
        @fetch-voting-power="handleFetchVotingPower"
      />
      <dl>
        <dt class="text-sm leading-5">Choice</dt>
        <dd class="font-semibold text-skin-heading text-[20px] leading-6">
          <span
            v-if="choice"
            class="test-skin-heading"
            v-text="getChoiceText(proposal.choices, choice)"
          />
          <span v-else class="text-skin-danger"> No choice selected </span>
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
        <UiForm v-model="form" :error="formErrors" :definition="definition" />
      </div>
    </div>

    <template #footer>
      <div class="flex space-x-3">
        <UiButton class="w-full" @click="$emit('close')"> Cancel </UiButton>
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
