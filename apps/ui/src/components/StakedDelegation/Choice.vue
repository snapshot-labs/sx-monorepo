<script setup lang="ts">
import { FunctionalComponent } from 'vue';
import {
  getStakedDelegationConfig,
  getValidators,
  isSameAddress,
  isValidStarknetAddress,
  Membership,
  normalizeAddress
} from '@/helpers/stakedVoteDelegation';
import { shortenAddress } from '@/helpers/utils';
import IHSwitchHorizontal from '~icons/heroicons-outline/switch-horizontal';
import IHUser from '~icons/heroicons-outline/user';
import IHUserGroup from '~icons/heroicons-outline/user-group';

type Option = 'default' | 'self' | 'delegate';

const props = defineProps<{
  account: string;
  delegatee: string | null | undefined;
  isLoading: boolean;
  memberships?: Membership[];
}>();

const {
  pendingAction,
  lastSaved,
  isReadOnly,
  delegate,
  keepOwnVote,
  resetDelegation
} = useStakedDelegationActions();

const { explorerUrl } = getStakedDelegationConfig();

const OPTIONS: {
  id: Option;
  title: string;
  description: string;
  icon: FunctionalComponent;
}[] = [
  {
    id: 'default',
    title: 'Let my validators vote',
    description:
      'Each validator votes with the stake you have in its pool. This is the default.',
    icon: IHUserGroup
  },
  {
    id: 'self',
    title: 'Vote myself',
    description:
      'You vote with all of your pool stake, whatever your validators do.',
    icon: IHUser
  },
  {
    id: 'delegate',
    title: 'Delegate to someone else',
    description:
      'One address of your choice votes with all of your pool stake.',
    icon: IHSwitchHorizontal
  }
];

const current = computed<Option>(() => {
  if (!props.delegatee) return 'default';
  return isSameAddress(props.delegatee, props.account) ? 'self' : 'delegate';
});

const selected = ref<Option>('default');
const delegateeInput = ref('');
const isInputFocused = ref(false);

watch(
  () => [current.value, props.delegatee] as const,
  ([value, delegatee]) => {
    selected.value = value;
    delegateeInput.value =
      value === 'delegate' && delegatee ? normalizeAddress(delegatee) : '';
  },
  { immediate: true }
);

const hasDeclinedValidators = computed(() =>
  (props.memberships ?? []).some(m => m.reason === 'declined')
);

const inputError = computed(() => {
  const value = delegateeInput.value;
  if (!value || !isValidStarknetAddress(value)) return '';
  if (isSameAddress(value, props.account)) {
    return 'That is your own address. Choose "Vote myself" instead.';
  }
  return '';
});

const suggestions = computed(() => {
  const query = delegateeInput.value.trim().toLowerCase();
  if (isValidStarknetAddress(query)) return [];
  const mine = new Set(
    (props.memberships ?? []).map(m => m.validator.staker.toLowerCase())
  );
  return getValidators()
    .filter(validator => !mine.has(validator.staker.toLowerCase()))
    .filter(
      validator =>
        !query ||
        validator.name?.toLowerCase().includes(query) ||
        validator.staker.toLowerCase().includes(query.replace(/^0x0*/, ''))
    )
    .slice(0, 5);
});

const isDirty = computed(() => {
  if (selected.value !== current.value) return true;
  return (
    selected.value === 'delegate' &&
    !isSameAddress(delegateeInput.value, props.delegatee)
  );
});

const canSave = computed(() => {
  if (!isDirty.value || pendingAction.value || isReadOnly.value) return false;
  if (selected.value !== 'delegate') return true;
  return isValidStarknetAddress(delegateeInput.value) && !inputError.value;
});

const saveLabel = computed(() => {
  if (!isDirty.value) return 'Save choice';
  if (selected.value === 'default') return 'Go back to default';
  if (selected.value === 'self') return 'Vote myself';
  return 'Delegate';
});

/** Delegate to preview; `undefined` while the address is not valid yet. */
const previewDelegatee = computed<string | null | undefined>(() => {
  if (selected.value === 'default') return null;
  if (selected.value === 'self') return props.account;
  return isValidStarknetAddress(delegateeInput.value) && !inputError.value
    ? normalizeAddress(delegateeInput.value)
    : undefined;
});

const radioRefs = ref<HTMLButtonElement[]>([]);

// Arrow keys move the selection, as in a native radio group.
function handleRadioKeydown(event: KeyboardEvent, index: number) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
    event.key
  ];
  if (!step) return;
  event.preventDefault();
  const next = (index + step + OPTIONS.length) % OPTIONS.length;
  selected.value = OPTIONS[next].id;
  radioRefs.value[next]?.focus();
}

function selectSuggestion(staker: string) {
  delegateeInput.value = staker;
  isInputFocused.value = false;
}

async function save() {
  if (!canSave.value) return;
  if (selected.value === 'default') return resetDelegation();
  if (selected.value === 'self') return keepOwnVote();
  return delegate(normalizeAddress(delegateeInput.value));
}

function handleBlur() {
  // Let clicks on suggestions land before hiding them.
  setTimeout(() => (isInputFocused.value = false), 150);
}
</script>

<template>
  <UiLoading v-if="isLoading" class="block" />
  <div v-else class="flex flex-col gap-3">
    <div class="grid gap-2.5 md:grid-cols-3" role="radiogroup">
      <button
        v-for="(option, index) in OPTIONS"
        :key="option.id"
        ref="radioRefs"
        type="button"
        role="radio"
        :aria-checked="selected === option.id"
        :tabindex="selected === option.id ? 0 : -1"
        :disabled="!!pendingAction"
        class="relative text-left border rounded-lg p-3.5 flex flex-col gap-2 transition-colors disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-skin-link"
        :class="
          selected === option.id
            ? 'border-skin-link bg-skin-border/30'
            : 'hover:border-skin-text'
        "
        @click="selected = option.id"
        @keydown="handleRadioKeydown($event, index)"
      >
        <div class="flex items-center justify-between gap-2">
          <div
            class="size-[36px] rounded-full flex items-center justify-center"
            :class="
              selected === option.id
                ? 'bg-skin-link text-skin-bg'
                : 'bg-skin-border text-skin-link'
            "
          >
            <component :is="option.icon" class="size-[18px]" />
          </div>
          <UiPill v-if="current === option.id" variant="primary">
            Current
          </UiPill>
        </div>
        <h4 class="text-skin-heading leading-6" v-text="option.title" />
        <p
          class="text-skin-text text-[16px] leading-[22px]"
          v-text="option.description"
        />
      </button>
    </div>

    <UiMessage
      v-if="selected === 'default' && hasDeclinedValidators"
      type="info"
    >
      One of your validators declined default delegations, so you keep the vote
      for the stake in its pool.
    </UiMessage>

    <div v-if="selected === 'delegate'" class="relative max-w-[640px]">
      <UiInputString
        v-model="delegateeInput"
        :error="inputError"
        :definition="{
          type: 'string',
          title: 'Delegate',
          examples: ['Search validators or paste a Starknet address']
        }"
        @focus="isInputFocused = true"
        @blur="handleBlur"
      />
      <div
        v-if="isInputFocused && suggestions.length"
        class="absolute z-20 left-0 right-0 -mt-2 border rounded-lg bg-skin-bg shadow-xl overflow-hidden"
      >
        <div class="px-3 pt-2 pb-1 text-skin-text text-sm">Validators</div>
        <button
          v-for="validator in suggestions"
          :key="validator.staker"
          type="button"
          class="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-skin-border/40 text-left"
          @mousedown.prevent="selectSuggestion(validator.staker)"
        >
          <UiStamp :id="validator.staker" type="avatar" :size="24" />
          <span class="text-skin-link truncate">
            {{ validator.name || shortenAddress(validator.staker) }}
          </span>
          <span
            v-if="validator.name"
            class="text-skin-text text-sm ml-auto shrink-0"
          >
            {{ shortenAddress(validator.staker) }}
          </span>
        </button>
      </div>
    </div>

    <StakedDelegationVotingPowerPreview
      v-if="memberships?.length && previewDelegatee !== undefined"
      :account="account"
      :memberships="memberships"
      :delegatee="previewDelegatee"
      :is-changed="isDirty"
      class="max-w-[640px]"
    />

    <div class="flex flex-wrap items-center gap-3">
      <UiButton
        primary
        :disabled="!canSave"
        :loading="!!pendingAction"
        @click="save"
      >
        {{ saveLabel }}
      </UiButton>
      <span v-if="pendingAction" class="text-skin-text text-[16px]">
        Confirm in your wallet, then wait for the transaction to be accepted.
      </span>
      <span v-else-if="isReadOnly" class="text-skin-text text-[16px]">
        You are viewing this address as a guest. Connect its wallet to make
        changes.
      </span>
      <span
        v-else-if="lastSaved && !isDirty"
        class="flex items-center gap-1.5 text-skin-success text-[16px]"
      >
        <IH-check-circle class="shrink-0" />
        Saved on-chain.
        <AppLink
          :to="`${explorerUrl}/tx/${lastSaved.txHash}`"
          class="text-skin-link flex items-center gap-0.5"
        >
          View transaction
          <IH-arrow-sm-right class="-rotate-45" />
        </AppLink>
      </span>
      <span v-else-if="!isDirty" class="text-skin-text text-[16px]">
        Choose an option to change where your vote goes.
      </span>
    </div>
  </div>
</template>
