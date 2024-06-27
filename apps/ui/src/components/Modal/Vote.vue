<script setup lang="ts">
import { getChoiceText, getFormattedVotingPower } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import Loading from '@/components/Ui/Loading.vue';
import ISXCircle from '~icons/heroicons-solid/x-circle';
import ISCheckCircle from '~icons/heroicons-solid/check-circle';
import ICLens from '~icons/c/lens';
import ICFarcaster from '~icons/c/farcaster';
import type { Choice, Proposal } from '@/types';

type VoteSteps = 'vote' | 'signing' | 'sending' | 'success' | 'error';

const STEPS = {
  signing: {
    icon: {
      component: Loading,
      class: 'opacity-40'
    },
    title: 'Confirm your vote',
    subtitle: 'We need your signature',
    cta: 'Proceed in your wallet'
  },
  sending: {
    icon: {
      component: Loading,
      class: 'opacity-40'
    },
    title: 'Confirming transaction',
    subtitle: 'This can take a few minutes',
    cta: 'View transaction'
  },
  success: {
    icon: {
      component: ISCheckCircle,
      class: 'text-skin-success'
    },
    title: 'Your vote is in!',
    subtitle: '',
    cta: 'View transaction'
  },
  error: {
    icon: {
      component: ISXCircle,
      class: 'text-skin-danger'
    },
    title: 'Vote failed',
    subtitle: 'Oops... Your vote failed!',
    cta: ''
  }
};

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
const currentStep = ref<VoteSteps>('vote');
const voteTx = ref('');
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
    currentStep.value = 'signing';
    await vote(props.proposal, props.choice, form.value.reason);
    // emit('voted');
  } catch (e) {
    if (e.code === 4001) {
      currentStep.value = 'sending';
    }
  } finally {
    loading.value = false;
    // emit('close');
  }
}

function handleFetchVotingPower() {
  fetchVotingPower(props.proposal);
}

function handleClose() {
  currentStep.value = 'vote';
  emit('close');
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
  <UiModal :open="open" @close="handleClose">
    <template v-if="currentStep === 'vote'" #header>
      <h3>Cast your vote</h3>
    </template>

    <div v-if="currentStep === 'vote'" class="m-4 flex flex-col space-y-3">
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
    <div v-else-if="STEPS[currentStep]">
      <div class="flex flex-col p-4 space-y-4 text-center items-center">
        <component
          :is="STEPS[currentStep].icon.component"
          :width="64"
          :height="64"
          :class="STEPS[currentStep].icon.class"
        />
        <div class="flex flex-col space-y-1 leading-6">
          <div
            class="font-semibold text-skin-heading text-[22px]"
            v-text="STEPS[currentStep].title"
          />
          <div
            v-if="STEPS[currentStep].subtitle"
            class="text-md"
            v-text="STEPS[currentStep].subtitle"
          />
        </div>
        <div v-if="currentStep === 'success'" class="pb-2.5">
          <div class="text-md">Share your vote</div>
          <div class="p-2.5 flex space-x-2">
            <UiButton class="!px-0 w-[40px] !h-[40px]"><ICX class="inline-block" /></UiButton>
            <UiButton class="!px-0 w-[40px] !h-[40px]"><ICLens class="inline-block" /></UiButton>
            <UiButton class="!px-0 w-[40px] !h-[40px]"
              ><ICFarcaster class="inline-block"
            /></UiButton>
          </div>
        </div>
      </div>
      <a
        v-if="STEPS[currentStep].cta"
        class="text-skin-link text-md opacity-40 w-full leading-6 p-4 text-center block"
        :href="['sending', 'success'].includes(currentStep) ? voteTx : '#'"
        target="_blank"
      >
        {{ STEPS[currentStep].cta }}
      </a>
    </div>

    <template v-if="currentStep === 'vote' || currentStep === 'error'" #footer>
      <div class="flex space-x-3">
        <UiButton class="w-full" @click="$emit('close')"> Cancel </UiButton>
        <UiButton
          primary
          class="w-full"
          :disabled="!canSubmit"
          :loading="loading"
          @click="handleSubmit"
        >
          {{ currentStep === 'error' ? 'Try again' : 'Confirm' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
