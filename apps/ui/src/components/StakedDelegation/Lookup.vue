<script setup lang="ts">
import {
  getValidator,
  isSameAddress,
  isValidStarknetAddress,
  shortenVoter
} from '@/helpers/stakedVoteDelegation';
import { _c } from '@/helpers/utils';
import {
  useIsStakerQuery,
  useMembershipsQuery,
  useStakedDelegateeQuery,
  useValidatorConfigQuery
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
  progress
} = useMembershipsQuery(address);
const { data: delegatee, isPending: isDelegateePending } =
  useStakedDelegateeQuery(address);
const { data: isStaker } = useIsStakerQuery(address);
const { data: validatorConfig } = useValidatorConfigQuery(() =>
  isStaker.value ? address.value : ''
);

const validator = computed(() =>
  address.value ? getValidator(address.value) : null
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
      <div class="flex items-center gap-3">
        <StakedDelegationAddress :address="address" :size="40" />
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="border rounded-lg px-3.5 py-3">
          <UiEyebrow class="text-skin-text">As a delegator</UiEyebrow>
          <UiLoading v-if="isDelegateePending" class="mt-1" />
          <div v-else class="text-skin-heading" v-text="choice" />
        </div>
        <div v-if="isStaker" class="border rounded-lg px-3.5 py-3">
          <UiEyebrow class="text-skin-text">As a validator</UiEyebrow>
          <UiLoading v-if="!validatorConfig" class="mt-1" />
          <div v-else class="flex flex-col gap-0.5">
            <div class="text-skin-heading">
              {{
                validatorConfig.acceptsDefaultDelegations
                  ? 'Accepts default delegations'
                  : 'Declined default delegations'
              }}
            </div>
            <div class="text-skin-text text-[16px]">
              Votes with
              {{
                isSameAddress(validatorConfig.voteReceiver, address)
                  ? 'its staker address'
                  : shortenVoter(validatorConfig.voteReceiver)
              }}<template v-if="validator">
                · {{ _c(validator.delegated) }} STRK delegated</template
              >
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <UiEyebrow class="text-skin-text">Pools</UiEyebrow>
        <StakedDelegationMemberships
          :memberships="memberships"
          :member="address"
          :is-loading="isFetchingMemberships && !memberships"
          :is-error="isMembershipsError"
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
