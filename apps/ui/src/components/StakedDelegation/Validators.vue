<script setup lang="ts">
import { getStakedDelegationConfig } from '@/helpers/stakedVoteDelegation';
import { _n } from '@/helpers/utils';

const PAGE_SIZE = 15;

const { pools } = getStakedDelegationConfig();

const search = ref('');
const limit = ref(PAGE_SIZE);

const validators = computed(() =>
  pools.validators.filter(validator => BigInt(validator.delegated) > 0n)
);
const totalDelegated = computed(() =>
  validators.value.reduce((sum, v) => sum + BigInt(v.delegated), 0n)
);
const filtered = computed(() => {
  const query = search.value.trim().toLowerCase().replace(/^0x0*/, '');
  if (!query) return validators.value;
  return validators.value.filter(validator =>
    validator.staker.toLowerCase().replace(/^0x0*/, '').includes(query)
  );
});
const visible = computed(() => filtered.value.slice(0, limit.value));

watch(search, () => (limit.value = PAGE_SIZE));
</script>

<template>
  <div class="border rounded-lg overflow-hidden">
    <div class="flex items-center gap-2.5 px-4 py-2.5 border-b">
      <IH-search class="shrink-0 text-skin-text" />
      <input
        v-model="search"
        type="text"
        placeholder="Search by staker address"
        class="flex-1 bg-transparent text-skin-link outline-none placeholder:text-skin-text min-w-0"
      />
      <span class="text-skin-text text-sm whitespace-nowrap">
        {{ _n(filtered.length) }} validators
      </span>
    </div>
    <div
      class="flex items-center gap-3 px-4 py-2 border-b text-skin-text text-sm font-medium"
    >
      <div class="w-[28px] shrink-0">#</div>
      <div class="flex-1">Validator</div>
      <div class="hidden md:block w-[180px] shrink-0">Votes with</div>
      <div class="hidden sm:block w-[110px] shrink-0 text-right">Defaults</div>
      <div class="w-[110px] sm:w-[140px] shrink-0 text-right">
        Delegated STRK
      </div>
    </div>
    <UiStateWarning v-if="!filtered.length" class="px-4 py-3">
      No validator matches this address.
    </UiStateWarning>
    <StakedDelegationValidatorRow
      v-for="validator in visible"
      :key="validator.staker"
      :validator="validator"
      :rank="validators.indexOf(validator) + 1"
      :total-delegated="totalDelegated"
    />
    <div
      v-if="filtered.length > visible.length"
      class="flex justify-center p-3"
    >
      <UiButton @click="limit += PAGE_SIZE">Show more</UiButton>
    </div>
  </div>
</template>
