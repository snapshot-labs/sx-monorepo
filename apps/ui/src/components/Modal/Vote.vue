<script setup lang="ts">
import { getChoiceText, getFormattedVotingPower } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import Loading from '@/components/Ui/Loading.vue';
import ISXCircle from '~icons/heroicons-solid/x-circle';
import ISCheckCircle from '~icons/heroicons-solid/check-circle';
import ICX from '~icons/c/x';
import ICLens from '~icons/c/lens';
import ICFarcaster from '~icons/c/farcaster';
import { offchainNetworks } from '@/networks';
import type { Choice, Proposal } from '@/types';

type VoteSteps = 'vote' | 'signing' | 'sending' | 'success' | 'error';

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
const currentStepIndex = ref<VoteSteps>('vote');
const form = ref<Record<string, string>>({ reason: '' });

const STEPS = {
  signing: {
    icon: {
      component: Loading,
      class: 'opacity-40'
    },
    title: 'Confirm your vote',
    subtitle: 'We need your signature',
    footerText: 'Proceed in your wallet'
  },
  sending: {
    icon: {
      component: Loading,
      class: 'opacity-40'
    },
    title: 'Confirming transaction',
    subtitle: 'This can take a few minutes',
    viewTx: !offchainNetworks.includes(props.proposal.network)
  },
  success: {
    icon: {
      component: ISCheckCircle,
      class: 'text-skin-success mt-4'
    },
    title: 'Your vote is in!',
    subtitle: '',
    viewTx: !offchainNetworks.includes(props.proposal.network)
  },
  error: {
    icon: {
      component: ISXCircle,
      class: 'text-skin-danger'
    },
    title: 'Vote failed',
    subtitle: 'Oops... Your vote failed!'
  }
};

const SHARE_SOCIAL_NETWORKS = [
  { id: 'x', name: 'X', icon: ICX },
  { id: 'lens', name: 'Lens', icon: ICLens },
  { id: 'farcaster', name: 'Farcaster', icon: ICFarcaster }
];

const formErrors = computed(() =>
  validateForm(definition, form.value, { skipEmptyOptionalFields: true })
);

const formattedVotingPower = computed(() => getFormattedVotingPower(votingPower.value));

const canSubmit = computed(
  () => !!props.choice && Object.keys(formErrors.value).length === 0 && hasVoteVp.value
);

const currentStep = computed(() => STEPS[currentStepIndex.value]);

async function handleSubmit() {
  loading.value = true;

  if (!props.choice) return;

  try {
    currentStepIndex.value = 'signing';
    await vote(props.proposal, props.choice, form.value.reason);

    if (offchainNetworks.includes(props.proposal.network)) {
      currentStepIndex.value = 'success';
    }
  } catch (e) {
    if (e.code === 4001) {
      currentStepIndex.value = 'vote';
    } else {
      currentStepIndex.value = 'error';
    }
  } finally {
    loading.value = false;
  }
}

function handleFetchVotingPower() {
  fetchVotingPower(props.proposal);
}

function handleClose() {
  currentStepIndex.value = 'vote';
  emit('close');
}

function handleShareVote(type: string) {
  console.log('Share vote', type);
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
    <template v-if="currentStepIndex === 'vote'" #header>
      <h3>Cast your vote</h3>
    </template>

    <div v-if="currentStepIndex === 'vote'" class="m-4 flex flex-col space-y-3">
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
    <div v-else-if="currentStep">
      <div class="flex flex-col p-4 space-y-4 text-center items-center">
        <component
          :is="currentStep.icon.component"
          :width="64"
          :height="64"
          :class="currentStep.icon.class"
        />
        <div class="flex flex-col space-y-1 leading-6">
          <div class="font-semibold text-skin-heading text-[22px]" v-text="currentStep.title" />
          <div v-if="currentStep.subtitle" class="text-md" v-text="currentStep.subtitle" />
        </div>
        <div v-if="currentStepIndex === 'success'" class="pb-2.5">
          <div class="text-md">Share your vote</div>
          <div class="p-2.5 flex space-x-2">
            <UiButton
              v-for="(network, i) in SHARE_SOCIAL_NETWORKS"
              :key="i"
              class="!px-0 w-[40px] !h-[40px]"
              @click="handleShareVote(network.id)"
            >
              <component :is="network.icon" class="inline-block" />
            </UiButton>
          </div>
        </div>
      </div>
      <a
        v-if="currentStep.viewTx"
        class="text-skin-link text-md opacity-40 w-full leading-6 p-4 text-center block"
        href="#"
        target="_blank"
      >
        View transaction
      </a>
      <div
        v-else-if="currentStep.footerText"
        class="text-skin-link text-md opacity-40 w-full leading-6 p-4 text-center block"
        v-text="currentStep.footerText"
      />
    </div>

    <template v-if="currentStepIndex === 'vote' || currentStepIndex === 'error'" #footer>
      <div class="flex space-x-3">
        <UiButton class="w-full" @click="$emit('close')"> Cancel </UiButton>
        <UiButton
          primary
          class="w-full"
          :disabled="!canSubmit"
          :loading="loading"
          @click="handleSubmit"
        >
          {{ currentStepIndex === 'error' ? 'Try again' : 'Confirm' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
