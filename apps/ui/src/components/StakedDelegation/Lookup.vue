<script setup lang="ts">
import {
  getValidator,
  getValidatorProfile,
  isSameAddress,
  isValidStarknetAddress,
  shortenVoter
} from '@/helpers/stakedVoteDelegation';
import {
  useIsStakerQuery,
  useMembershipsQuery,
  useStakedDelegateeQuery,
  useValidatorConfigQuery,
  useVotingRecordsQuery
} from '@/queries/stakedVoteDelegation';

const props = defineProps<{ initialAddress?: string }>();

const input = ref(props.initialAddress ?? '');
const address = ref(
  props.initialAddress && isValidStarknetAddress(props.initialAddress)
    ? props.initialAddress
    : ''
);

watch(
  () => props.initialAddress,
  value => {
    if (value && isValidStarknetAddress(value)) {
      input.value = value;
      address.value = value;
    }
  }
);

const error = computed(() =>
  input.value && !isValidStarknetAddress(input.value)
    ? 'Enter a valid Starknet address.'
    : ''
);

const {
  data: memberships,
  isFetching: isFetchingMemberships,
  isError: isMembershipsError,
  isPlaceholderData: isMembershipsCached,
  progress
} = useMembershipsQuery(address);
const { data: delegatee, isPending: isDelegateePending } =
  useStakedDelegateeQuery(address);
const { data: isStaker } = useIsStakerQuery(address);
const { data: validatorConfig } = useValidatorConfigQuery(() =>
  isStaker.value ? address.value : ''
);

/** Votes are cast by the vote receiver when the address is a validator. */
const voter = computed(() =>
  (isStaker.value && validatorConfig.value
    ? validatorConfig.value.voteReceiver
    : address.value
  ).toLowerCase()
);

const recordVoters = computed(() => {
  if (!address.value) return [];
  return [
    voter.value,
    ...(memberships.value ?? []).map(m => m.config.voteReceiver)
  ];
});
const {
  data: records,
  isPending: isRecordsPending,
  isError: isRecordsError
} = useVotingRecordsQuery(recordVoters);

const validator = computed(() =>
  address.value ? getValidator(address.value) : null
);
const isValidator = computed(() => !!isStaker.value || !!validator.value);
const profile = computed(() =>
  address.value ? getValidatorProfile(address.value) : null
);

const choice = computed(() => {
  if (delegatee.value === undefined) return '';
  if (delegatee.value === null) return 'Default: their validators vote';
  if (isSameAddress(delegatee.value, address.value)) return 'Votes themselves';
  return `Delegates to ${shortenVoter(delegatee.value)}`;
});

function handleSubmit() {
  if (!input.value || error.value) return;
  address.value = input.value;
}
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <form
      class="flex gap-2.5 items-start max-w-[720px]"
      @submit.prevent="handleSubmit"
    >
      <div class="flex-1 min-w-0">
        <UiInputString
          v-model="input"
          :error="error"
          :definition="{
            type: 'string',
            title: 'Starknet address',
            examples: ['Paste a delegator or validator address']
          }"
        />
      </div>
      <UiButton
        type="submit"
        primary
        class="mt-[22px] shrink-0"
        :disabled="!input || !!error"
      >
        Look up
      </UiButton>
    </form>

    <template v-if="address">
      <StakedDelegationValidatorProfileCard
        v-if="isValidator"
        :staker="address"
        :config="validatorConfig"
        :record="records?.[voter]"
        :is-record-loading="isRecordsPending"
      />
      <div v-else class="flex flex-col gap-2">
        <StakedDelegationAddress :address="address" :size="40" />
        <div
          v-if="profile?.about || profile?.website"
          class="flex flex-col gap-1 max-w-[720px] text-[16px] leading-6"
        >
          <p
            v-if="profile.about"
            class="text-skin-text"
            v-text="profile.about"
          />
          <AppLink
            v-if="profile.website"
            :to="profile.website"
            class="text-skin-link flex items-center gap-1 self-start"
          >
            {{ profile.website.replace(/^https?:\/\//, '') }}
            <IH-arrow-sm-right class="-rotate-45" />
          </AppLink>
        </div>
      </div>

      <div
        v-if="!isValidator || delegatee || memberships?.length"
        class="grid gap-3 sm:grid-cols-2"
      >
        <div class="border rounded-lg px-3.5 py-3">
          <UiEyebrow class="text-skin-text">As a delegator</UiEyebrow>
          <UiLoading v-if="isDelegateePending" class="mt-1" />
          <div v-else class="text-skin-heading" v-text="choice" />
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <UiEyebrow class="text-skin-text">
          Voting record{{
            voter !== address.toLowerCase() ? ' (via vote receiver)' : ''
          }}
        </UiEyebrow>
        <StakedDelegationVotingRecord
          :record="records?.[voter]"
          :is-loading="isRecordsPending"
          :is-error="isRecordsError"
        />
      </div>

      <div class="flex flex-col gap-2">
        <UiEyebrow class="text-skin-text">Staked with</UiEyebrow>
        <StakedDelegationMemberships
          :memberships="memberships"
          :member="address"
          :is-own="false"
          :records="records"
          :is-loading="isFetchingMemberships && !memberships"
          :is-error="isMembershipsError"
          :is-refreshing="isMembershipsCached"
          :progress="progress"
        >
          <template #empty>
            This address has no stake in a STRK delegation pool.
          </template>
        </StakedDelegationMemberships>
      </div>
    </template>
  </div>
</template>
