<script setup lang="ts">
import {
  getStakedDelegationConfig,
  getValidator,
  isSameAddress,
  isValidStarknetAddress,
  normalizeAddress
} from '@/helpers/stakedVoteDelegation';
import { _c } from '@/helpers/utils';
import {
  useValidatorConfigQuery,
  useVotingRecordsQuery
} from '@/queries/stakedVoteDelegation';

const props = defineProps<{ staker: string }>();

const {
  pendingAction,
  lastSaved,
  isReadOnly,
  setVoteReceiver,
  resetVoteReceiver,
  setAcceptsDefaultDelegations
} = useStakedDelegationActions();

const { explorerUrl } = getStakedDelegationConfig();

// Public profile: the validator's Snapshot profile, signed by its wallet.
const usersStore = useUsersStore();
const {
  request: requestProfile,
  getProfile,
  refresh: refreshProfile
} = useSnapshotProfiles();
watch(
  () => props.staker,
  staker => {
    requestProfile(staker);
    usersStore.fetchUser(staker);
  },
  { immediate: true }
);
const profile = computed(() => getProfile(props.staker));
const user = computed(
  () => usersStore.getUser(props.staker) ?? { id: props.staker, created: null }
);
const isProfileOpen = ref(false);

function closeProfile() {
  isProfileOpen.value = false;
  refreshProfile(props.staker);
}

const { data: config, isPending } = useValidatorConfigQuery(() => props.staker);
const { data: records } = useVotingRecordsQuery(() =>
  config.value ? [config.value.voteReceiver] : []
);

const validator = computed(() => getValidator(props.staker));
const record = computed(() =>
  config.value
    ? records.value?.[config.value.voteReceiver.toLowerCase()]
    : undefined
);
const hasCustomReceiver = computed(
  () =>
    !!config.value && !isSameAddress(config.value.voteReceiver, props.staker)
);

const summary = computed(() => {
  const v = validator.value;
  if (!v) return 'Not in the validator list yet';
  const parts = [
    `${_c(v.own)} STRK self-stake`,
    `${_c(v.delegated)} STRK delegated`
  ];
  if (v.commission !== null) parts.push(`${v.commission / 100}% commission`);
  return parts.join(' · ');
});

// Vote receiver dialog
const isReceiverOpen = ref(false);
const receiverInput = ref('');
const isFullAddress = computed(() =>
  /^0x[0-9a-fA-F]{60,64}$/.test(receiverInput.value.trim())
);
const receiverError = computed(() => {
  const value = receiverInput.value;
  if (!value || !isFullAddress.value) return '';
  if (!isValidStarknetAddress(value)) return 'Enter a valid Starknet address.';
  if (config.value && isSameAddress(value, config.value.voteReceiver)) {
    return 'This is already your vote receiver.';
  }
  return '';
});
const canSaveReceiver = computed(
  () =>
    isFullAddress.value &&
    !receiverError.value &&
    !pendingAction.value &&
    !isReadOnly.value
);

function openReceiver() {
  receiverInput.value = '';
  isReceiverOpen.value = true;
}

async function saveReceiver() {
  if (!canSaveReceiver.value) return;
  if (await setVoteReceiver(normalizeAddress(receiverInput.value))) {
    isReceiverOpen.value = false;
  }
}

async function useStakerAddress() {
  if (await resetVoteReceiver()) isReceiverOpen.value = false;
}

// Default delegations dialog
const isDefaultsOpen = ref(false);
const accepts = ref(true);

const DEFAULT_OPTIONS = [
  {
    value: true,
    title: 'Vote for my delegators',
    description: 'Delegators who made no choice give you their vote. Default.'
  },
  {
    value: false,
    title: 'Let delegators keep their vote',
    description: 'Decline if you do not want to, or cannot, vote for them.'
  }
];

function openDefaults() {
  accepts.value = config.value?.acceptsDefaultDelegations ?? true;
  isDefaultsOpen.value = true;
}

const isDefaultsDirty = computed(
  () =>
    !!config.value && accepts.value !== config.value.acceptsDefaultDelegations
);

async function saveDefaults() {
  if (!isDefaultsDirty.value || isReadOnly.value) return;
  if (await setAcceptsDefaultDelegations(accepts.value)) {
    isDefaultsOpen.value = false;
  }
}

const footerNote = computed(() => {
  if (pendingAction.value) {
    return 'Confirm in your wallet, then wait for the transaction to be accepted.';
  }
  if (isReadOnly.value) {
    return 'Viewing as a guest. Connect this wallet to save.';
  }
  return 'Counts from the next proposal. You can change it at any time.';
});
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <div class="border rounded-lg">
      <div class="p-4 flex items-center gap-3">
        <StakedDelegationAddress :address="staker" :size="44" compact />
        <div class="flex-1" />
        <StakedDelegationRecordDots v-if="record" :record="record" />
      </div>
      <div class="border-t px-4 py-2.5 flex flex-col gap-1.5 text-[15px]">
        <span class="text-skin-text" v-text="summary" />
        <div
          v-if="lastSaved"
          class="flex items-center gap-1.5 text-skin-success"
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
        </div>
      </div>
    </div>

    <UiLoading v-if="isPending" class="block" />
    <div v-else-if="config" class="border rounded-lg">
      <div class="p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-b">
        <div class="flex-1 min-w-0 flex flex-col gap-1.5">
          <div>
            <h4 class="text-skin-heading">Public profile</h4>
            <p class="text-skin-text text-[15px] leading-[22px]">
              Name, picture and description delegators see when they open your
              validator. Stored as your Snapshot profile and signed by this
              wallet.
            </p>
          </div>
          <div class="flex items-start gap-2.5 min-w-0">
            <UiStamp :id="staker" type="avatar" :size="24" class="shrink-0" />
            <div class="min-w-0">
              <div
                class="text-skin-link truncate"
                v-text="profile?.name || 'No name yet'"
              />
              <div
                class="text-skin-text text-[15px] line-clamp-2"
                v-text="profile?.about || 'No description yet'"
              />
            </div>
          </div>
        </div>
        <UiButton
          class="shrink-0 sm:min-w-[120px]"
          :disabled="isReadOnly"
          @click="isProfileOpen = true"
        >
          Edit profile
        </UiButton>
      </div>
      <div class="p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-b">
        <div class="flex-1 min-w-0 flex flex-col gap-1.5">
          <div>
            <h4 class="text-skin-heading">Vote receiver</h4>
            <p class="text-skin-text text-[15px] leading-[22px]">
              Votes with your self-stake and your pool's default delegations.
              Useful if your staker address is a cold wallet.
            </p>
          </div>
          <StakedDelegationAddress
            :address="config.voteReceiver"
            :size="24"
            :label="hasCustomReceiver ? undefined : 'Your staker address'"
            compact
          />
        </div>
        <UiButton class="shrink-0 sm:min-w-[120px]" @click="openReceiver">
          Change
        </UiButton>
      </div>
      <div class="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div class="flex-1 min-w-0 flex flex-col gap-1.5">
          <div>
            <h4 class="text-skin-heading">Default delegations</h4>
            <p class="text-skin-text text-[15px] leading-[22px]">
              Delegators who made no choice
              {{
                config.acceptsDefaultDelegations
                  ? 'give you their vote.'
                  : 'keep their own vote.'
              }}
            </p>
          </div>
          <div>
            <UiPill
              :variant="
                config.acceptsDefaultDelegations ? 'default' : 'secondary'
              "
              class="w-[84px] text-center"
            >
              {{ config.acceptsDefaultDelegations ? 'Accepting' : 'Declined' }}
            </UiPill>
          </div>
        </div>
        <UiButton class="shrink-0 sm:min-w-[120px]" @click="openDefaults">
          Change
        </UiButton>
      </div>
    </div>

    <teleport to="#modal">
      <ModalEditUser
        v-if="!isReadOnly"
        :open="isProfileOpen"
        :user="user"
        @close="closeProfile"
      />
    </teleport>

    <!-- Vote receiver dialog -->
    <UiModal
      :open="isReceiverOpen"
      :closeable="!pendingAction"
      @close="isReceiverOpen = false"
    >
      <template #header>
        <h3>Vote receiver</h3>
      </template>
      <div class="p-4 flex flex-col gap-3">
        <p class="text-skin-text text-[15px] leading-[22px]">
          This address votes with your self-stake and with the stake of
          delegators who made no choice. Your stake does not move.
        </p>
        <UiInputString
          v-model="receiverInput"
          :error="receiverError"
          :definition="{
            type: 'string',
            title: 'New vote receiver',
            examples: ['Paste a Starknet address']
          }"
          class="!mb-0"
        />
        <button
          v-if="hasCustomReceiver"
          type="button"
          class="text-skin-link text-[15px] self-start disabled:opacity-50"
          :disabled="!!pendingAction || isReadOnly"
          @click="useStakerAddress"
        >
          Use my staker address instead
        </button>
      </div>
      <template #footer>
        <div class="flex flex-col gap-2.5">
          <UiButton
            primary
            class="w-full"
            :disabled="!canSaveReceiver"
            :loading="!!pendingAction"
            @click="saveReceiver"
          >
            Save vote receiver
          </UiButton>
          <span class="text-skin-text text-[15px]" v-text="footerNote" />
        </div>
      </template>
    </UiModal>

    <!-- Default delegations dialog -->
    <UiModal
      :open="isDefaultsOpen"
      :closeable="!pendingAction"
      @close="isDefaultsOpen = false"
    >
      <template #header>
        <h3>Default delegations</h3>
      </template>
      <div class="p-4 flex flex-col gap-2" role="radiogroup">
        <button
          v-for="option in DEFAULT_OPTIONS"
          :key="String(option.value)"
          type="button"
          role="radio"
          :aria-checked="accepts === option.value"
          :disabled="!!pendingAction"
          class="text-left border rounded-lg px-3 py-2.5 flex items-center gap-3 transition-colors disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-skin-link"
          :class="
            accepts === option.value
              ? 'border-skin-link bg-skin-border/30'
              : 'hover:border-skin-text'
          "
          @click="accepts = option.value"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-skin-heading" v-text="option.title" />
              <UiPill v-if="config?.acceptsDefaultDelegations === option.value">
                Current
              </UiPill>
            </div>
            <div
              class="text-skin-text text-[15px] leading-5"
              v-text="option.description"
            />
          </div>
          <span
            class="size-[18px] shrink-0 rounded-full border-2 flex items-center justify-center"
            :class="
              accepts === option.value
                ? 'border-skin-link'
                : 'border-skin-border'
            "
          >
            <span
              v-if="accepts === option.value"
              class="size-[8px] rounded-full bg-skin-link"
            />
          </span>
        </button>
        <p class="text-skin-text text-[15px] leading-[22px] pt-1">
          Your self-stake always follows your vote receiver. Delegators who
          chose a delegate are not affected.
        </p>
      </div>
      <template #footer>
        <div class="flex flex-col gap-2.5">
          <UiButton
            primary
            class="w-full"
            :disabled="!isDefaultsDirty || !!pendingAction || isReadOnly"
            :loading="!!pendingAction"
            @click="saveDefaults"
          >
            {{
              !isDefaultsDirty
                ? 'No changes'
                : accepts
                  ? 'Accept default delegations'
                  : 'Decline default delegations'
            }}
          </UiButton>
          <span class="text-skin-text text-[15px]" v-text="footerNote" />
        </div>
      </template>
    </UiModal>
  </div>
</template>
