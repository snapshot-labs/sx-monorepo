<script setup lang="ts">
import { FunctionalComponent } from 'vue';
import {
  getValidators,
  isSameAddress,
  isValidStarknetAddress,
  Membership,
  normalizeAddress,
  ValidatorPool
} from '@/helpers/stakedVoteDelegation';
import { shortenAddress } from '@/helpers/utils';
import IHSwitchHorizontal from '~icons/heroicons-outline/switch-horizontal';
import IHUser from '~icons/heroicons-outline/user';
import IHUserGroup from '~icons/heroicons-outline/user-group';

type Option = 'default' | 'self' | 'delegate';

const props = defineProps<{
  open: boolean;
  account: string;
  delegatee: string | null | undefined;
  memberships?: Membership[];
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

const { pendingAction, isReadOnly, delegate, keepOwnVote, resetDelegation } =
  useStakedDelegationActions();

const OPTIONS: {
  id: Option;
  title: string;
  description: string;
  icon: FunctionalComponent;
}[] = [
  {
    id: 'default',
    title: 'Let my validators vote',
    description: 'Each validator votes with the stake in its pool. Default.',
    icon: IHUserGroup
  },
  {
    id: 'self',
    title: 'Vote myself',
    description: 'You vote with all of your pool stake.',
    icon: IHUser
  },
  {
    id: 'delegate',
    title: 'Delegate to someone else',
    description: 'One address votes with all of your pool stake.',
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
const delegateField = ref<HTMLElement | null>(null);

// Bring the address field into view when "Delegate" is picked. Focus stays
// on the option so arrow-key navigation keeps working.
watch(selected, async (value, previous) => {
  if (value !== 'delegate' || previous === 'delegate' || !props.open) return;
  await nextTick();
  delegateField.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
});
const radioRefs = ref<HTMLButtonElement[]>([]);

function reset() {
  selected.value = current.value;
  delegateeInput.value =
    current.value === 'delegate' && props.delegatee
      ? normalizeAddress(props.delegatee)
      : '';
}

watch(
  () => props.open,
  isOpen => {
    if (isOpen) reset();
  },
  { immediate: true }
);

/** A pasted full address (not a partial search like "0x0e"). */
const isFullAddress = computed(() =>
  /^0x[0-9a-fA-F]{60,64}$/.test(delegateeInput.value.trim())
);

const inputError = computed(() => {
  const value = delegateeInput.value;
  if (!value || !isFullAddress.value) return '';
  if (!isValidStarknetAddress(value)) return 'Enter a valid Starknet address.';
  if (isSameAddress(value, props.account)) {
    return 'That is your own address. Choose "Vote myself" instead.';
  }
  return '';
});

// Validators' own Snapshot profile names, so search finds e.g. "teku".
const { request: requestProfile, getProfile } = useSnapshotProfiles();
watch(
  () => props.open,
  isOpen => {
    if (isOpen) getValidators().forEach(v => requestProfile(v.staker));
  },
  { immediate: true }
);

function nameOf(validator: ValidatorPool) {
  return validator.name || getProfile(validator.staker)?.name || '';
}

const suggestions = computed(() => {
  const query = delegateeInput.value.trim().toLowerCase();
  if (isFullAddress.value) return [];
  const mine = new Set(
    (props.memberships ?? []).map(m => m.validator.staker.toLowerCase())
  );
  const hex = query.replace(/^0x0*/, '');
  return getValidators()
    .filter(validator => !mine.has(validator.staker.toLowerCase()))
    .filter(
      validator =>
        !query ||
        nameOf(validator).toLowerCase().includes(query) ||
        (hex && validator.staker.toLowerCase().includes(hex))
    )
    .slice(0, 4);
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
  return (
    isFullAddress.value &&
    isValidStarknetAddress(delegateeInput.value) &&
    !inputError.value
  );
});

const saveLabel = computed(() => {
  if (!isDirty.value) return 'No changes';
  if (selected.value === 'default') return 'Go back to default';
  if (selected.value === 'self') return 'Vote myself';
  return 'Delegate';
});

/** Delegate to preview; `undefined` while the address is not valid yet. */
const previewDelegatee = computed<string | null | undefined>(() => {
  if (selected.value === 'default') return null;
  if (selected.value === 'self') return props.account;
  return isFullAddress.value &&
    isValidStarknetAddress(delegateeInput.value) &&
    !inputError.value
    ? normalizeAddress(delegateeInput.value)
    : undefined;
});

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

async function save() {
  if (!canSave.value) return;
  let ok: boolean;
  if (selected.value === 'default') ok = await resetDelegation();
  else if (selected.value === 'self') ok = await keepOwnVote();
  else ok = await delegate(normalizeAddress(delegateeInput.value));
  if (ok) emit('close');
}
</script>

<template>
  <UiModal :open="open" :closeable="!pendingAction" @close="emit('close')">
    <template #header>
      <h3>Who votes with your stake?</h3>
    </template>

    <div class="p-4 flex flex-col gap-3">
      <div class="flex flex-col gap-2" role="radiogroup">
        <button
          v-for="(option, index) in OPTIONS"
          :key="option.id"
          ref="radioRefs"
          type="button"
          role="radio"
          :aria-checked="selected === option.id"
          :tabindex="selected === option.id ? 0 : -1"
          :disabled="!!pendingAction"
          class="text-left border rounded-lg px-3 py-2.5 flex items-center gap-3 transition-colors disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-skin-link"
          :class="
            selected === option.id
              ? 'border-skin-link bg-skin-border/30'
              : 'hover:border-skin-text'
          "
          @click="selected = option.id"
          @keydown="handleRadioKeydown($event, index)"
        >
          <div
            class="size-[32px] shrink-0 rounded-full flex items-center justify-center"
            :class="
              selected === option.id
                ? 'bg-skin-link text-skin-bg'
                : 'bg-skin-border text-skin-link'
            "
          >
            <component :is="option.icon" class="size-[16px]" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-skin-heading" v-text="option.title" />
              <UiPill v-if="current === option.id">Current</UiPill>
            </div>
            <div
              class="text-skin-text text-[15px] leading-5"
              v-text="option.description"
            />
          </div>
          <span
            class="size-[18px] shrink-0 rounded-full border-2 flex items-center justify-center"
            :class="
              selected === option.id ? 'border-skin-link' : 'border-skin-border'
            "
          >
            <span
              v-if="selected === option.id"
              class="size-[8px] rounded-full bg-skin-link"
            />
          </span>
        </button>
      </div>

      <div
        v-if="selected === 'delegate'"
        ref="delegateField"
        class="flex flex-col gap-1.5"
      >
        <UiInputString
          v-model="delegateeInput"
          :error="inputError"
          :definition="{
            type: 'string',
            title: 'Delegate',
            examples: ['Search validators or paste an address']
          }"
          class="!mb-0"
          @focus="isInputFocused = true"
          @blur="isInputFocused = false"
        />
        <div
          v-if="
            suggestions.length &&
            (isInputFocused || (delegateeInput && !isFullAddress))
          "
          class="border rounded-lg overflow-hidden"
        >
          <button
            v-for="validator in suggestions"
            :key="validator.staker"
            type="button"
            class="w-full flex items-center gap-2.5 px-3 py-2 border-b last:border-b-0 hover:bg-skin-border/40 text-left"
            @mousedown.prevent="delegateeInput = validator.staker"
          >
            <UiStamp :id="validator.staker" type="avatar" :size="20" />
            <span class="text-skin-link truncate">
              {{ nameOf(validator) || shortenAddress(validator.staker) }}
            </span>
            <span
              v-if="nameOf(validator)"
              class="text-skin-text text-sm ml-auto shrink-0"
            >
              {{ shortenAddress(validator.staker) }}
            </span>
          </button>
        </div>
      </div>

      <StakedDelegationVotingPowerPreview
        v-if="isDirty && memberships?.length && previewDelegatee !== undefined"
        :account="account"
        :memberships="memberships"
        :delegatee="previewDelegatee"
      />
    </div>

    <template #footer>
      <div class="flex flex-col gap-2.5">
        <UiButton
          primary
          class="w-full"
          :disabled="!canSave"
          :loading="!!pendingAction"
          @click="save"
        >
          {{ saveLabel }}
        </UiButton>
        <span v-if="pendingAction" class="text-skin-text text-[15px]">
          Confirm in your wallet, then wait for the transaction to be accepted.
        </span>
        <span v-else-if="isReadOnly" class="text-skin-text text-[15px]">
          Viewing as a guest. Connect this wallet to save.
        </span>
        <span v-else class="text-skin-text text-[15px]">
          Counts from the next proposal. You can change it at any time.
        </span>
      </div>
    </template>
  </UiModal>
</template>
