<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  getStakedDelegationConfig,
  getValidatorConfigs,
  getValidators,
  ValidatorConfig
} from '@/helpers/stakedVoteDelegation';
import { _n } from '@/helpers/utils';
import {
  stakedDelegationKeys,
  useVotingRecordsQuery
} from '@/queries/stakedVoteDelegation';

defineEmits<{ (e: 'select', staker: string): void }>();

const PAGE_SIZE = 20;

const { pools } = getStakedDelegationConfig();

const search = ref('');
const limit = ref(PAGE_SIZE);

const validators = computed(() =>
  getValidators().filter(validator => BigInt(validator.delegated) > 0n)
);
const totalDelegated = computed(() =>
  validators.value.reduce((sum, v) => sum + BigInt(v.delegated), 0n)
);
const filtered = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return validators.value;
  const hex = query.replace(/^0x0*/, '');
  return validators.value.filter(
    validator =>
      validator.name?.toLowerCase().includes(query) ||
      (hex && validator.staker.toLowerCase().replace(/^0x0*/, '').includes(hex))
  );
});
const visible = computed(() => filtered.value.slice(0, limit.value));

const queryClient = useQueryClient();
const visibleStakers = computed(() => visible.value.map(v => v.staker));

// Registry settings for every visible row in one request.
const { data: configs, isPending: isConfigsPending } = useQuery({
  queryKey: [...stakedDelegationKeys.all, 'validatorConfigs', visibleStakers],
  queryFn: async (): Promise<Record<string, ValidatorConfig>> => {
    const stakers = visibleStakers.value;
    const list = await getValidatorConfigs(stakers);
    return Object.fromEntries(
      stakers.map((staker, i) => {
        // Share with per-validator queries (lookup, settings).
        queryClient.setQueryData(
          stakedDelegationKeys.validatorConfig(staker),
          list[i]
        );
        return [staker, list[i]];
      })
    );
  },
  staleTime: 60_000,
  placeholderData: previous => previous
});

/** Address that votes for each visible validator (its vote receiver). */
const voterOf = computed(() =>
  Object.fromEntries(
    visible.value.map(validator => [
      validator.staker,
      (
        configs.value?.[validator.staker]?.voteReceiver ?? validator.staker
      ).toLowerCase()
    ])
  )
);
const areConfigsLoaded = computed(
  () =>
    !isConfigsPending.value &&
    visible.value.every(v => configs.value?.[v.staker])
);
const { data: records, isPending: isRecordsPending } = useVotingRecordsQuery(
  () => (areConfigsLoaded.value ? Object.values(voterOf.value) : [])
);

watch(search, () => (limit.value = PAGE_SIZE));
</script>

<template>
  <div>
    <div class="p-4 flex flex-col sm:flex-row sm:items-center gap-2.5">
      <div
        class="flex items-center gap-2 border rounded-full px-3 py-2 sm:w-[360px]"
      >
        <IH-search class="shrink-0 text-skin-text" />
        <input
          v-model="search"
          type="text"
          placeholder="Search by name or staker address"
          class="flex-1 bg-transparent text-skin-link outline-none placeholder:text-skin-text min-w-0"
        />
      </div>
      <span class="text-skin-text text-[16px] sm:ml-auto">
        {{ _n(filtered.length) }} validators · pool sizes as of block
        {{ _n(pools.block) }}
      </span>
    </div>

    <UiColumnHeader class="space-x-3 border-t">
      <div class="w-[28px] shrink-0">#</div>
      <div class="flex-1 truncate">Validator</div>
      <div class="hidden xl:block w-[200px] shrink-0 truncate">Votes with</div>
      <div class="hidden sm:block w-[96px] shrink-0">
        <UiTooltip title="Votes cast on the last 6 Starknet votes and polls">
          <span>Record</span>
        </UiTooltip>
      </div>
      <div class="hidden sm:block w-[110px] shrink-0 text-right">Defaults</div>
      <div class="w-[110px] sm:w-[150px] shrink-0 text-right truncate">
        Delegated STRK
      </div>
    </UiColumnHeader>

    <UiStateWarning v-if="!filtered.length" class="px-4 py-3">
      No validator matches your search.
    </UiStateWarning>
    <StakedDelegationValidatorRow
      v-for="validator in visible"
      :key="validator.staker"
      :validator="validator"
      :rank="validators.indexOf(validator) + 1"
      :total-delegated="totalDelegated"
      :config="configs?.[validator.staker]"
      :is-config-loading="!configs?.[validator.staker]"
      :record="records?.[voterOf[validator.staker]]"
      :is-record-loading="isRecordsPending"
      @click="$emit('select', validator.staker)"
    />
    <div
      v-if="filtered.length > visible.length"
      class="flex justify-center p-4"
    >
      <UiButton @click="limit += PAGE_SIZE">Show more</UiButton>
    </div>
  </div>
</template>
