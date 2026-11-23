<script setup lang="ts">
import {
  isSameAddress,
  isValidStarknetAddress
} from '@/helpers/stakedVoteDelegation';
import {
  useIsStakerQuery,
  useMembershipsQuery,
  useStakedDelegateeQuery,
  useValidatorConfigQuery
} from '@/queries/stakedVoteDelegation';

const input = ref('');
const address = ref('');

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
const { data: delegatee } = useStakedDelegateeQuery(address);
const { data: isStaker } = useIsStakerQuery(address);
const { data: validatorConfig } = useValidatorConfigQuery(() =>
  isStaker.value ? address.value : ''
);

function handleSubmit() {
  if (!input.value || error.value) return;
  address.value = input.value;
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <form class="flex gap-2.5 items-start" @submit.prevent="handleSubmit">
      <div class="flex-1 min-w-0">
        <UiInputString
          v-model="input"
          :error="error"
          :definition="{
            type: 'string',
            title: 'Starknet address',
            examples: ['0x…']
          }"
        />
      </div>
      <UiButton
        type="submit"
        primary
        class="mt-[22px] shrink-0"
        :disabled="!input || !!error"
        :loading="isFetchingMemberships"
      >
        Look up
      </UiButton>
    </form>

    <template v-if="address">
      <div class="flex flex-wrap gap-2.5 text-[16px]">
        <div class="border rounded-full px-3 py-1 text-skin-text">
          Choice:
          <span class="text-skin-link">
            {{
              delegatee === undefined
                ? '…'
                : delegatee === null
                  ? 'Default (validator)'
                  : isSameAddress(delegatee, address)
                    ? 'Keeps own vote'
                    : 'Delegates to another address'
            }}
          </span>
        </div>
        <div
          v-if="isStaker && validatorConfig"
          class="border rounded-full px-3 py-1 text-skin-text"
        >
          Validator:
          <span class="text-skin-link">
            {{
              validatorConfig.acceptsDefaultDelegations
                ? 'accepting default delegations'
                : 'declined default delegations'
            }}
          </span>
        </div>
      </div>
      <StakedDelegationMemberships
        :memberships="memberships"
        :is-loading="isFetchingMemberships"
        :is-error="isMembershipsError"
        :progress="progress"
        empty-text="This address has no stake in a STRK delegation pool."
      />
    </template>
  </div>
</template>
