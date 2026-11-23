<script setup lang="ts">
import {
  getValidator,
  isSameAddress,
  isValidStarknetAddress,
  normalizeAddress
} from '@/helpers/stakedVoteDelegation';
import { _c } from '@/helpers/utils';
import { useValidatorConfigQuery } from '@/queries/stakedVoteDelegation';

const props = defineProps<{ staker: string }>();

const {
  pendingAction,
  isReadOnly,
  setVoteReceiver,
  resetVoteReceiver,
  setAcceptsDefaultDelegations
} = useStakedDelegationActions();

const { data: config, isPending } = useValidatorConfigQuery(() => props.staker);

const validator = computed(() => getValidator(props.staker));
const hasCustomReceiver = computed(
  () =>
    !!config.value && !isSameAddress(config.value.voteReceiver, props.staker)
);

const isEditingReceiver = ref(false);
const receiverInput = ref('');
const accepts = ref(true);

watch(
  () => config.value?.acceptsDefaultDelegations,
  value => {
    if (value !== undefined) accepts.value = value;
  },
  { immediate: true }
);

const receiverError = computed(() => {
  const value = receiverInput.value;
  if (!value) return '';
  if (!isValidStarknetAddress(value)) return 'Enter a valid Starknet address.';
  if (config.value && isSameAddress(value, config.value.voteReceiver)) {
    return 'This is already your vote receiver.';
  }
  return '';
});

const isAcceptsDirty = computed(
  () =>
    !!config.value && accepts.value !== config.value.acceptsDefaultDelegations
);

const ACCEPT_OPTIONS = [
  {
    value: true,
    title: 'Vote for my delegators',
    description:
      'Delegators who made no choice give you their vote. This is the default.'
  },
  {
    value: false,
    title: 'Let delegators keep their vote',
    description:
      'Decline default delegations if you do not want to, or cannot, vote for them.'
  }
];

async function handleSetReceiver() {
  if (receiverError.value || !receiverInput.value) return;
  const ok = await setVoteReceiver(normalizeAddress(receiverInput.value));
  if (ok) {
    receiverInput.value = '';
    isEditingReceiver.value = false;
  }
}
</script>

<template>
  <div>
    <div class="p-4 grid grid-cols-1 xs:grid-cols-3 gap-2 xs:gap-3">
      <div
        class="border rounded-lg px-3.5 py-2.5 xs:py-3 flex items-center justify-between gap-2 xs:block"
      >
        <UiEyebrow class="text-skin-text">Self-stake</UiEyebrow>
        <div class="text-skin-heading text-lg truncate">
          {{ validator ? _c(validator.own) : '—' }}
          <span class="text-skin-text text-sm">STRK</span>
        </div>
      </div>
      <div
        class="border rounded-lg px-3.5 py-2.5 xs:py-3 flex items-center justify-between gap-2 xs:block"
      >
        <UiEyebrow class="text-skin-text">Delegated to your pool</UiEyebrow>
        <div class="text-skin-heading text-lg truncate">
          {{ validator ? _c(validator.delegated) : '—' }}
          <span class="text-skin-text text-sm">STRK</span>
        </div>
      </div>
      <div
        class="border rounded-lg px-3.5 py-2.5 xs:py-3 flex items-center justify-between gap-2 xs:block"
      >
        <UiEyebrow class="text-skin-text">Commission</UiEyebrow>
        <div class="text-skin-heading text-lg">
          {{
            validator?.commission != null
              ? `${validator.commission / 100}%`
              : '—'
          }}
        </div>
      </div>
    </div>

    <UiLoading v-if="isPending" class="block px-4 pb-4" />
    <template v-else-if="config">
      <UiSectionHeader label="Vote receiver" />
      <div class="p-4 flex flex-col gap-3">
        <p class="text-skin-text text-[16px] leading-6 max-w-[640px]">
          The address that votes with your self-stake and with the default
          delegations of your pool. Use it if your staker address is a cold
          wallet.
        </p>
        <div
          class="border rounded-lg px-3.5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 max-w-[720px]"
        >
          <div class="flex-1 min-w-0">
            <StakedDelegationAddress
              :address="config.voteReceiver"
              :subtitle="
                hasCustomReceiver ? undefined : 'Your staker address (default)'
              "
            />
          </div>
          <div v-if="!isReadOnly && !isEditingReceiver" class="flex gap-2.5">
            <UiButton
              :disabled="!!pendingAction"
              @click="isEditingReceiver = true"
            >
              Change
            </UiButton>
            <UiButton
              v-if="hasCustomReceiver"
              :loading="pendingAction === 'reset-vote-receiver'"
              :disabled="!!pendingAction"
              @click="resetVoteReceiver"
            >
              Reset
            </UiButton>
          </div>
        </div>
        <form
          v-if="isEditingReceiver"
          class="flex flex-col gap-2.5 max-w-[720px]"
          @submit.prevent="handleSetReceiver"
        >
          <UiInputString
            v-model="receiverInput"
            :error="receiverError"
            :definition="{
              type: 'string',
              title: 'New vote receiver',
              examples: ['0x…']
            }"
          />
          <div class="flex gap-2.5">
            <UiButton
              type="submit"
              primary
              :loading="pendingAction === 'vote-receiver'"
              :disabled="!receiverInput || !!receiverError || !!pendingAction"
            >
              Save vote receiver
            </UiButton>
            <UiButton
              :disabled="!!pendingAction"
              @click="
                isEditingReceiver = false;
                receiverInput = '';
              "
            >
              Cancel
            </UiButton>
          </div>
        </form>
      </div>

      <UiSectionHeader label="Default delegations" />
      <div class="p-4 flex flex-col gap-3">
        <div
          class="grid gap-2.5 sm:grid-cols-2 max-w-[720px]"
          role="radiogroup"
        >
          <button
            v-for="option in ACCEPT_OPTIONS"
            :key="String(option.value)"
            type="button"
            role="radio"
            :aria-checked="accepts === option.value"
            :disabled="!!pendingAction"
            class="text-left border rounded-lg p-3.5 flex flex-col gap-1.5 transition-colors disabled:cursor-not-allowed"
            :class="
              accepts === option.value
                ? 'border-skin-link bg-skin-border/30'
                : 'hover:border-skin-text'
            "
            @click="accepts = option.value"
          >
            <div class="flex items-center justify-between gap-2">
              <h4 class="text-skin-heading leading-6" v-text="option.title" />
              <UiPill
                v-if="config.acceptsDefaultDelegations === option.value"
                variant="primary"
              >
                Current
              </UiPill>
            </div>
            <p
              class="text-skin-text text-[16px] leading-[22px]"
              v-text="option.description"
            />
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <UiButton
            primary
            :disabled="!isAcceptsDirty || !!pendingAction || isReadOnly"
            :loading="pendingAction === 'accepts'"
            @click="setAcceptsDefaultDelegations(accepts)"
          >
            Save
          </UiButton>
          <span v-if="isReadOnly" class="text-skin-text text-[16px]">
            You are viewing this validator as a guest. Connect its staker wallet
            to make changes.
          </span>
          <span v-else-if="pendingAction" class="text-skin-text text-[16px]">
            Confirm in your wallet, then wait for the transaction to be
            accepted.
          </span>
        </div>
        <p class="text-skin-text text-[15px] max-w-[640px]">
          Your self-stake always follows your vote receiver. Delegators who
          chose a delegate are not affected by either setting.
        </p>
      </div>
    </template>
  </div>
</template>
