<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  getStakedDelegationConfig,
  getValidatorConfigs,
  getValidators,
  totalStake,
  ValidatorConfig,
  ValidatorPool
} from '@/helpers/stakedVoteDelegation';
import { _n } from '@/helpers/utils';
import {
  stakedDelegationKeys,
  useMembershipsQuery,
  useVotingRecordsQuery
} from '@/queries/stakedVoteDelegation';

const props = defineProps<{ account: string }>();
defineEmits<{ (e: 'select', staker: string): void }>();

type SortKey = 'power' | 'commission' | 'uptime' | 'record' | 'yours';

const PAGE_SIZE = 20;

const { pools } = getStakedDelegationConfig();

const search = ref('');
const limit = ref(PAGE_SIZE);
const view = ref<'all' | 'yours'>('all');
const sortKey = ref<SortKey>('power');
const sortDesc = ref(true);

// All validators with a STRK pool, including empty pools: a validator with no
// delegators yet is still a valid choice.
const validators = computed(() => getValidators());
const allStake = computed(() =>
  validators.value.reduce((sum, v) => sum + totalStake(v), 0n)
);
const rankOf = computed(
  () => new Map(validators.value.map((v, i) => [v.staker, i + 1]))
);

function shareOf(validator: ValidatorPool) {
  if (allStake.value === 0n) return 0;
  return Number((totalStake(validator) * 1_000_000n) / allStake.value) / 1e6;
}

// The connected wallet's stake per validator (shared with the Your vote tab).
const { data: memberships, isPending: isMembershipsPending } =
  useMembershipsQuery(() => props.account);
const yourStake = computed(
  () =>
    new Map((memberships.value ?? []).map(m => [m.validator.staker, m.amount]))
);
const hasYourValidators = computed(() => yourStake.value.size > 0);

watch(hasYourValidators, has => {
  if (!has) view.value = 'all';
});

const filtered = computed(() => {
  let list = validators.value;
  if (view.value === 'yours') {
    list = list.filter(v => yourStake.value.has(v.staker));
  }
  const query = search.value.trim().toLowerCase();
  if (!query) return list;
  const hex = query.replace(/^0x0*/, '');
  return list.filter(
    validator =>
      validator.name?.toLowerCase().includes(query) ||
      (hex && validator.staker.toLowerCase().replace(/^0x0*/, '').includes(hex))
  );
});

const queryClient = useQueryClient();

/** Sort values that do not need per-row requests. */
function sortValue(validator: ValidatorPool): number | bigint {
  switch (sortKey.value) {
    case 'commission':
      return validator.commission ?? -1;
    case 'uptime':
      return validator.liveness ?? -1;
    case 'record':
      return records.value?.[voterOf(validator)]?.cast ?? -1;
    case 'yours':
      return yourStake.value.get(validator.staker) ?? 0n;
    default:
      return totalStake(validator);
  }
}

const sorted = computed(() => {
  const list = [...filtered.value];
  if (sortKey.value === 'power' && sortDesc.value) return list;
  return list.sort((a, b) => {
    const [x, y] = [sortValue(a), sortValue(b)];
    if (x === y) return 0;
    return (x > y ? 1 : -1) * (sortDesc.value ? -1 : 1);
  });
});
const visible = computed(() => sorted.value.slice(0, limit.value));
const visibleStakers = computed(() => visible.value.map(v => v.staker));

// Registry settings for every visible row in one request.
const { data: configs } = useQuery({
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

/** Address that votes for a validator (its vote receiver). */
function voterOf(validator: ValidatorPool) {
  return (
    configs.value?.[validator.staker]?.voteReceiver ?? validator.staker
  ).toLowerCase();
}

// Voting records for every validator (and known vote receivers), so the
// table can sort by them.
const { data: records, isPending: isRecordsPending } = useVotingRecordsQuery(
  () => [
    ...validators.value.map(v => v.staker),
    ...Object.values(configs.value ?? {}).map(c => c.voteReceiver)
  ]
);

function setSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortKey.value = key;
    sortDesc.value = key !== 'commission';
  }
}

watch([search, view, sortKey, sortDesc], () => (limit.value = PAGE_SIZE));

const COLUMNS: {
  key: SortKey;
  label: string;
  class: string;
  tooltip?: string;
}[] = [
  {
    key: 'power',
    label: 'Power',
    class: 'hidden md:flex w-[96px]',
    tooltip:
      'Staking power: share of all STRK staked (self-stake plus delegated)'
  },
  {
    key: 'power',
    label: 'Stake',
    class: 'flex w-[88px] sm:w-[96px]',
    tooltip: 'STRK staked: self-stake plus delegated'
  },
  { key: 'commission', label: 'Commission', class: 'hidden sm:flex w-[100px]' },
  {
    key: 'uptime',
    label: 'Uptime',
    class: 'hidden lg:flex w-[84px]',
    tooltip: 'Share of epochs attested in the last 30 days'
  },
  {
    key: 'record',
    label: 'Record',
    class: 'hidden xl:flex w-[88px]',
    tooltip: 'Votes cast on the last 6 Starknet votes and polls'
  }
];
</script>

<template>
  <div>
    <div class="p-4 flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="px-3 py-1.5 rounded-full border text-[16px] transition-colors"
          :class="
            view === 'all'
              ? 'bg-skin-link text-skin-bg border-skin-link'
              : 'text-skin-link hover:border-skin-text'
          "
          @click="view = 'all'"
        >
          All validators
          <span class="opacity-70 ml-0.5">{{ _n(validators.length) }}</span>
        </button>
        <button
          v-if="account"
          type="button"
          class="px-3 py-1.5 rounded-full border text-[16px] transition-colors disabled:opacity-50"
          :class="
            view === 'yours'
              ? 'bg-skin-link text-skin-bg border-skin-link'
              : 'text-skin-link hover:border-skin-text'
          "
          :disabled="!hasYourValidators"
          @click="view = 'yours'"
        >
          Your validators
          <UiLoading
            v-if="isMembershipsPending"
            :size="12"
            class="inline-block ml-1"
          />
          <span v-else class="opacity-70 ml-0.5">{{ yourStake.size }}</span>
        </button>
        <div
          class="flex items-center gap-2 border rounded-full px-3 py-1.5 w-full sm:w-[320px] sm:ml-auto"
        >
          <IH-search class="shrink-0 text-skin-text" />
          <input
            v-model="search"
            type="text"
            placeholder="Search by name or address"
            class="flex-1 bg-transparent text-skin-link outline-none placeholder:text-skin-text min-w-0"
          />
        </div>
      </div>
      <span class="text-skin-text text-[15px]">
        STRK stake as of block {{ _n(pools.block)
        }}<template v-if="pools.liveness">
          · uptime over {{ pools.liveness.days }} days</template
        >. Defaults, vote receivers and records are live.
      </span>
    </div>

    <UiColumnHeader class="space-x-3 border-t">
      <div class="w-[28px] shrink-0">#</div>
      <div class="flex-1 min-w-[160px] truncate">Validator</div>
      <button
        v-for="column in COLUMNS"
        :key="column.label"
        type="button"
        class="shrink-0 items-center justify-end gap-1 hover:text-skin-link truncate"
        :class="column.class"
        :title="column.tooltip"
        @click="setSort(column.key)"
      >
        <span class="truncate">{{ column.label }}</span>
        <template v-if="sortKey === column.key && column.label !== 'Stake'">
          <IH-arrow-sm-down v-if="sortDesc" class="shrink-0" />
          <IH-arrow-sm-up v-else class="shrink-0" />
        </template>
      </button>
      <button
        v-if="hasYourValidators"
        type="button"
        class="hidden lg:flex w-[88px] shrink-0 items-center justify-end gap-1 hover:text-skin-link truncate"
        @click="setSort('yours')"
      >
        <span class="truncate">Your stake</span>
        <template v-if="sortKey === 'yours'">
          <IH-arrow-sm-down v-if="sortDesc" class="shrink-0" />
          <IH-arrow-sm-up v-else class="shrink-0" />
        </template>
      </button>
      <div class="hidden 2xl:block w-[92px] shrink-0" />
    </UiColumnHeader>

    <UiStateWarning v-if="!sorted.length" class="px-4 py-3">
      No validator matches your search.
    </UiStateWarning>
    <StakedDelegationValidatorRow
      v-for="validator in visible"
      :key="validator.staker"
      :validator="validator"
      :rank="rankOf.get(validator.staker) ?? 0"
      :share="shareOf(validator)"
      :config="configs?.[validator.staker]"
      :record="records?.[voterOf(validator)]"
      :is-record-loading="isRecordsPending"
      :your-stake="yourStake.get(validator.staker)"
      :show-your-stake="hasYourValidators"
      @select="$emit('select', validator.staker)"
    />
    <div v-if="sorted.length > visible.length" class="flex justify-center p-4">
      <UiButton @click="limit += PAGE_SIZE">Show more</UiButton>
    </div>
  </div>
</template>
