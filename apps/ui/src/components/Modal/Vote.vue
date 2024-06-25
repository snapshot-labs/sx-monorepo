<script setup lang="ts">
import { _vp, getChoiceText } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import type { Choice, Proposal, Space } from '@/types';

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
const votingPowersStore = useVotingPowersStore();

const loading = ref(false);
const form = ref<Record<string, string>>({ reason: '' });

const formErrors = computed(() =>
  validateForm(definition, form.value, { skipEmptyOptionalFields: true })
);
const votingPower = computed(() =>
  votingPowersStore.get(props.proposal.space as Space, props.proposal.snapshot)
);
const totalVotingPower = computed(() => {
  if (!votingPower.value) return 0n;

  return votingPower.value.votingPowers.reduce((acc, b) => acc + b.value, 0n);
});
const decimals = computed(() =>
  Math.max(...votingPower.value.votingPowers.map(votingPower => votingPower.decimals), 0)
);
const formattedVotingPower = computed(() => {
  const value = _vp(Number(totalVotingPower.value) / 10 ** decimals.value);

  if (votingPower.value.symbol) {
    return `${value} ${votingPower.value.symbol}`;
  }

  return value;
});

async function handleSubmit() {
  loading.value = true;

  if (!props.choice) return;

  try {
    await vote(props.proposal, props.choice, form.value.reason);
    emit('voted');
  } finally {
    loading.value = false;
    emit('close');
  }
}

watch(
  [() => props.open, () => props.proposal],
  ([open, proposal]) => {
    if (!open) return;

    votingPowersStore.fetch(proposal, web3.value.account, proposal.snapshot);
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
      </dl>
      <dl>
        <dt class="text-sm leading-5">Voting power</dt>
        <dd
          v-if="votingPower?.status === 'success'"
          class="font-semibold text-skin-heading text-[20px] leading-6"
          v-text="formattedVotingPower"
        />
        <dd
          v-else-if="votingPower?.status === 'error'"
          class="font-semibold text-skin-heading text-[20px] leading-6"
          v-text="formattedVotingPower"
        />
        <dd v-else>
          <UiLoading />
        </dd>
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
          :disabled="!choice || Object.keys(formErrors).length > 0 || totalVotingPower === 0n"
          :loading="loading"
          @click="handleSubmit"
        >
          Confirm
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
