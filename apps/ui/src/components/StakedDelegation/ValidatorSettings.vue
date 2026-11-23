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

const receiverError = computed(() => {
  const value = receiverInput.value;
  if (!value) return '';
  if (!isValidStarknetAddress(value)) return 'Enter a valid Starknet address.';
  if (config.value && isSameAddress(value, config.value.voteReceiver)) {
    return 'This is already your vote receiver.';
  }
  return '';
});

async function handleSetReceiver() {
  if (receiverError.value || !receiverInput.value) return;
  const ok = await setVoteReceiver(normalizeAddress(receiverInput.value));
  if (ok) {
    receiverInput.value = '';
    isEditingReceiver.value = false;
  }
}

function handleToggleAccepts() {
  if (!config.value) return;
  setAcceptsDefaultDelegations(!config.value.acceptsDefaultDelegations);
}
</script>

<template>
  <div class="border rounded-lg">
    <div class="p-4 flex flex-wrap gap-x-5 gap-y-2.5 border-b">
      <div class="flex flex-col">
        <UiEyebrow class="text-skin-text">Self-stake</UiEyebrow>
        <span class="text-skin-heading text-md">
          {{ validator ? `${_c(validator.own)} STRK` : '—' }}
        </span>
      </div>
      <div class="flex flex-col">
        <UiEyebrow class="text-skin-text">Delegated to your pool</UiEyebrow>
        <span class="text-skin-heading text-md">
          {{ validator ? `${_c(validator.delegated)} STRK` : '—' }}
        </span>
      </div>
    </div>

    <UiLoading v-if="isPending" class="block p-4" />
    <template v-else-if="config">
      <div class="p-4 flex flex-col gap-3 border-b">
        <div class="flex flex-col gap-1">
          <h4 class="text-skin-heading">Vote receiver</h4>
          <p class="text-skin-text text-[16px] leading-6 max-w-[560px]">
            The address that votes with your self-stake and with the default
            delegations of your pool. Useful if your staker address is a cold
            wallet.
          </p>
        </div>
        <div class="border rounded-lg px-3 py-2.5">
          <StakedDelegationAddress
            :address="config.voteReceiver"
            :subtitle="
              hasCustomReceiver ? undefined : 'Your staker address (default)'
            "
          />
        </div>
        <form
          v-if="isEditingReceiver"
          class="flex flex-col gap-2.5"
          @submit.prevent="handleSetReceiver"
        >
          <UiInputString
            v-model="receiverInput"
            :error="receiverError"
            :definition="{
              type: 'string',
              title: 'Vote receiver address',
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
              Save
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
        <div v-else-if="!isReadOnly" class="flex flex-wrap gap-2.5">
          <UiButton
            :disabled="!!pendingAction"
            @click="isEditingReceiver = true"
          >
            {{
              hasCustomReceiver ? 'Change vote receiver' : 'Set vote receiver'
            }}
          </UiButton>
          <UiButton
            v-if="hasCustomReceiver"
            :loading="pendingAction === 'reset-vote-receiver'"
            :disabled="!!pendingAction"
            @click="resetVoteReceiver"
          >
            Use my staker address
          </UiButton>
        </div>
      </div>

      <div class="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div class="flex-1 flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <h4 class="text-skin-heading">Default delegations</h4>
            <UiPill
              :variant="
                config.acceptsDefaultDelegations ? 'primary' : 'default'
              "
            >
              {{ config.acceptsDefaultDelegations ? 'Accepting' : 'Declined' }}
            </UiPill>
          </div>
          <p class="text-skin-text text-[16px] leading-6 max-w-[560px]">
            {{
              config.acceptsDefaultDelegations
                ? 'Delegators who made no choice give you their vote. Decline if you do not want to, or cannot, vote for them.'
                : 'Delegators who made no choice keep their own vote. Your self-stake still follows your vote receiver.'
            }}
          </p>
        </div>
        <UiButton
          v-if="!isReadOnly"
          class="shrink-0"
          :loading="pendingAction === 'accepts'"
          :disabled="!!pendingAction"
          @click="handleToggleAccepts"
        >
          {{
            config.acceptsDefaultDelegations
              ? 'Decline default delegations'
              : 'Accept default delegations'
          }}
        </UiButton>
      </div>
    </template>
  </div>
</template>
