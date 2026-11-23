<script setup lang="ts">
import {
  getStakedDelegationConfig,
  SNIP_URL
} from '@/helpers/stakedVoteDelegation';
import { useIsStakerQuery } from '@/queries/stakedVoteDelegation';

type Tab = 'vote' | 'validator' | 'validators' | 'lookup';

const route = useRoute();
const router = useRouter();
const { setTitle } = useTitle();
const { web3 } = useWeb3();
const { isStarknetWallet } = useStakedDelegationActions();

const config = getStakedDelegationConfig();

const account = computed(() =>
  isStarknetWallet.value ? web3.value.account : ''
);
const { data: isStaker } = useIsStakerQuery(account);

const tabs = computed<{ id: Tab; label: string }[]>(() => [
  { id: 'vote', label: 'Your vote' },
  ...(isStaker.value
    ? [{ id: 'validator' as const, label: 'Validator settings' }]
    : []),
  { id: 'validators', label: 'Validators' },
  { id: 'lookup', label: 'Look up' }
]);

const activeTab = computed<Tab>(() => {
  const tab = route.query.tab as Tab | undefined;
  return tabs.value.some(t => t.id === tab) ? tab! : 'vote';
});

function selectTab(tab: Tab, query: Record<string, string> = {}) {
  router.replace({ query: { ...route.query, tab, ...query } });
}

watchEffect(() => setTitle('Staked STRK vote delegation'));
</script>

<template>
  <div>
    <div class="p-4 flex flex-col gap-2.5">
      <h2 class="text-skin-heading">Staked STRK vote delegation</h2>
      <p class="text-skin-text max-w-[720px] leading-[26px]">
        The validator you stake with votes with your staked STRK by default. You
        can keep your own vote or give it to any address, at any time.
      </p>
      <div class="flex flex-wrap gap-x-3 gap-y-1 text-[16px]">
        <AppLink :to="SNIP_URL" class="flex items-center gap-1 text-skin-link">
          Read the proposal
          <IH-arrow-sm-right class="-rotate-45" />
        </AppLink>
        <AppLink
          v-if="config.registry"
          :to="`${config.explorerUrl}/contract/${config.registry}`"
          class="flex items-center gap-1 text-skin-link"
        >
          Registry contract
          <IH-arrow-sm-right class="-rotate-45" />
        </AppLink>
      </div>
    </div>

    <UiScrollerHorizontal
      class="z-40 sticky top-header-height-with-offset lg:top-header-height"
      with-buttons
      gradient="xxl"
    >
      <div class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          @click="selectTab(tab.id)"
        >
          <UiLabel :is-active="activeTab === tab.id" :text="tab.label" />
        </button>
      </div>
    </UiScrollerHorizontal>

    <UiStateWarning v-if="!config.registry" class="px-4 py-3">
      The delegation registry is not deployed on {{ config.name }} yet.
    </UiStateWarning>
    <template v-else>
      <StakedDelegationYourVote
        v-if="activeTab === 'vote'"
        :account="account"
        @browse-validators="selectTab('validators')"
      />
      <StakedDelegationValidatorSettings
        v-else-if="activeTab === 'validator' && account"
        :staker="account"
      />
      <StakedDelegationValidators
        v-else-if="activeTab === 'validators'"
        @select="staker => selectTab('lookup', { address: staker })"
      />
      <StakedDelegationLookup
        v-else-if="activeTab === 'lookup'"
        :initial-address="(route.query.address as string) || ''"
      />
    </template>
  </div>
</template>
