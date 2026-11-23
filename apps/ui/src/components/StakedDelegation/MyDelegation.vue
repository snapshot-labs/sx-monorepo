<script setup lang="ts">
import {
  isSameAddress,
  isValidStarknetAddress,
  normalizeAddress
} from '@/helpers/stakedVoteDelegation';

const props = defineProps<{
  account: string;
  delegatee: string | null | undefined;
  isLoading: boolean;
}>();

const { pendingAction, isReadOnly, delegate, keepOwnVote, resetDelegation } =
  useStakedDelegationActions();

const isEditing = ref(false);
const delegateeInput = ref('');

const isKeepingOwnVote = computed(() =>
  isSameAddress(props.delegatee, props.account)
);

const inputError = computed(() => {
  const value = delegateeInput.value;
  if (!value) return '';
  if (!isValidStarknetAddress(value)) return 'Enter a valid Starknet address.';
  if (isSameAddress(value, props.delegatee)) {
    return 'You already delegate to this address.';
  }
  return '';
});

const status = computed(() => {
  if (!props.delegatee) {
    return {
      title: 'Your validator votes for you',
      body: 'This is the default. Each validator you stake with votes with the STRK you have in its pool, unless it has declined default delegations.'
    };
  }
  if (isKeepingOwnVote.value) {
    return {
      title: 'You keep your own vote',
      body: 'You vote with all of your pool stake yourself, whatever your validators do.'
    };
  }
  return {
    title: 'You delegate to another address',
    body: 'This address votes with all of your pool stake, whatever your validators do.'
  };
});

async function handleDelegate() {
  if (inputError.value || !delegateeInput.value) return;
  const ok = await delegate(normalizeAddress(delegateeInput.value));
  if (ok) {
    delegateeInput.value = '';
    isEditing.value = false;
  }
}
</script>

<template>
  <div class="border rounded-lg">
    <div class="p-4 flex flex-col gap-3">
      <div class="flex items-start justify-between gap-3">
        <div class="flex flex-col gap-1">
          <UiEyebrow class="text-skin-text">Your choice</UiEyebrow>
          <UiLoading v-if="isLoading" class="my-1" />
          <template v-else>
            <h3 class="text-skin-heading" v-text="status.title" />
            <p
              class="text-skin-text text-[16px] leading-6 max-w-[560px]"
              v-text="status.body"
            />
          </template>
        </div>
        <UiPill
          v-if="!isLoading"
          :variant="delegatee ? 'primary' : 'default'"
          class="shrink-0"
        >
          {{ delegatee ? 'Opted out' : 'Default' }}
        </UiPill>
      </div>

      <div
        v-if="!isLoading && delegatee && !isKeepingOwnVote"
        class="border rounded-lg px-3 py-2.5"
      >
        <StakedDelegationAddress :address="delegatee" />
      </div>
    </div>

    <div v-if="isReadOnly" class="border-t p-4 text-skin-text text-[16px]">
      You are viewing this address as a guest. Connect its wallet to make
      changes.
    </div>
    <div v-else class="border-t p-4 flex flex-col gap-3">
      <div v-if="!isEditing" class="flex flex-wrap gap-2.5">
        <UiButton
          v-if="!isKeepingOwnVote"
          primary
          :loading="pendingAction === 'keep-own'"
          :disabled="!!pendingAction || isLoading"
          @click="keepOwnVote"
        >
          Keep my own vote
        </UiButton>
        <UiButton
          :disabled="!!pendingAction || isLoading"
          @click="isEditing = true"
        >
          <IH-user-add class="inline-block mr-1 -mt-0.5" />
          Delegate to an address
        </UiButton>
        <UiButton
          v-if="delegatee"
          :loading="pendingAction === 'reset'"
          :disabled="!!pendingAction || isLoading"
          @click="resetDelegation"
        >
          <IH-refresh class="inline-block mr-1 -mt-0.5" />
          Back to default
        </UiButton>
      </div>
      <form
        v-else
        class="flex flex-col gap-2.5"
        @submit.prevent="handleDelegate"
      >
        <UiInputString
          v-model="delegateeInput"
          :error="inputError"
          :definition="{
            type: 'string',
            title: 'Delegate address',
            examples: ['0x…'],
            description:
              'Any Starknet address. It votes with all of your pool stake, in every pool.'
          }"
        />
        <div class="flex gap-2.5">
          <UiButton
            type="submit"
            primary
            :loading="pendingAction === 'delegate'"
            :disabled="!delegateeInput || !!inputError || !!pendingAction"
          >
            Delegate
          </UiButton>
          <UiButton
            :disabled="!!pendingAction"
            @click="
              isEditing = false;
              delegateeInput = '';
            "
          >
            Cancel
          </UiButton>
        </div>
      </form>
      <p class="text-skin-text text-[15px] leading-5">
        No need to delegate to your own validator: it already gets your vote by
        default.
      </p>
    </div>
  </div>
</template>
