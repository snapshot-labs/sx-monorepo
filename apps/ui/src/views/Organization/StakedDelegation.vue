<script setup lang="ts">
import {
  getStakedDelegationConfig,
  SNIP_URL,
  STAKED_DELEGATION_NETWORK
} from '@/helpers/stakedVoteDelegation';
import { _n } from '@/helpers/utils';
import {
  useIsStakerQuery,
  useMembershipsQuery,
  useStakedDelegateeQuery
} from '@/queries/stakedVoteDelegation';

const { setTitle } = useTitle();
const { web3 } = useWeb3();
const { modalAccountOpen } = useModal();
const { isStarknetWallet } = useStakedDelegationActions();

const config = getStakedDelegationConfig();

const account = computed(() =>
  isStarknetWallet.value ? web3.value.account : ''
);

const { data: delegatee, isPending: isDelegateePending } =
  useStakedDelegateeQuery(account);
const {
  data: memberships,
  isFetching: isFetchingMemberships,
  isError: isMembershipsError,
  progress
} = useMembershipsQuery(account);
const { data: isStaker } = useIsStakerQuery(account);

const isTestnet = STAKED_DELEGATION_NETWORK !== 'sn';

watchEffect(() => setTitle('Staked STRK vote delegation'));
</script>

<template>
  <div class="max-w-[960px] w-full mx-auto pb-8">
    <!-- Hero -->
    <section class="px-4 pt-5 pb-4 flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <UiPill variant="primary">Draft SNIP</UiPill>
        <UiPill v-if="isTestnet">{{ config.name }} prototype</UiPill>
      </div>
      <h1 class="text-[32px] leading-[40px] text-skin-heading">
        Staked STRK vote delegation
      </h1>
      <p class="text-skin-text text-md leading-7 max-w-[680px]">
        Today, staked STRK only counts in Starknet governance if you vote
        yourself. Under this proposal, the validator you stake with votes for
        you by default, and you can take back your vote or give it to anyone, at
        any time.
      </p>
      <div class="flex flex-wrap gap-2.5 pt-1">
        <UiButton :to="SNIP_URL">
          <IH-document-text class="inline-block mr-1 -mt-0.5" />
          Read the SNIP
        </UiButton>
        <UiButton
          v-if="config.registry"
          :to="`${config.explorerUrl}/contract/${config.registry}`"
        >
          <IH-external-link class="inline-block mr-1 -mt-0.5" />
          Registry contract
        </UiButton>
      </div>
    </section>

    <section class="px-4 pb-5">
      <StakedDelegationHowItWorks />
    </section>

    <UiMessage v-if="!config.registry" type="danger" class="mx-4 mb-5">
      The delegation registry is not deployed on {{ config.name }} yet.
    </UiMessage>

    <!-- Your stake -->
    <UiSectionHeader label="Your staked STRK" />
    <section class="p-4 flex flex-col gap-3">
      <div
        v-if="!web3.account"
        class="border rounded-lg p-5 flex flex-col items-center text-center gap-2.5"
      >
        <IH-lightning-bolt class="size-[28px] text-skin-text" />
        <h3 class="text-skin-heading">Connect your Starknet wallet</h3>
        <p class="text-skin-text text-[16px] max-w-[440px]">
          See where your staked STRK votes go and change your choice.
        </p>
        <UiButton primary @click="modalAccountOpen = true">
          Connect wallet
        </UiButton>
      </div>
      <UiMessage v-else-if="!isStarknetWallet" type="info">
        Staked STRK lives on Starknet. Connect a Starknet wallet (Argent or
        Braavos) to manage your delegation.
      </UiMessage>
      <template v-else-if="config.registry">
        <StakedDelegationMyDelegation
          :account="account"
          :delegatee="delegatee"
          :is-loading="isDelegateePending"
        />
        <StakedDelegationMemberships
          :memberships="memberships"
          :is-loading="isFetchingMemberships && !memberships"
          :is-error="isMembershipsError"
          :progress="progress"
          empty-text="You have no STRK in a delegation pool on this network. Your choice is saved and applies as soon as you delegate to a pool."
        />
      </template>
    </section>

    <!-- Validator settings -->
    <template v-if="isStaker && config.registry">
      <UiSectionHeader label="Validator settings" />
      <section class="p-4">
        <StakedDelegationValidatorSettings :staker="account" />
      </section>
    </template>

    <!-- Lookup -->
    <template v-if="config.registry">
      <UiSectionHeader label="Look up an address" />
      <section class="p-4">
        <StakedDelegationLookup />
      </section>
    </template>

    <!-- Validators -->
    <UiSectionHeader label="Validators" />
    <section class="p-4 flex flex-col gap-2.5">
      <StakedDelegationValidators />
      <p class="text-skin-text text-[15px]">
        Validator list and pool sizes as of block
        {{ _n(config.pools.block) }}. Vote receivers and defaults are read live
        from the registry.
      </p>
    </section>

    <!-- Notes -->
    <section class="px-4">
      <div
        class="border rounded-lg p-4 flex gap-2.5 text-[16px] leading-6 text-skin-text"
      >
        <IH-information-circle class="shrink-0 mt-0.5 text-skin-link" />
        <div class="flex flex-col gap-1.5">
          <p>
            Changes only count for proposals whose snapshot block comes after
            them. Voting power is calculated off-chain from the staking contract
            and this registry at each proposal's snapshot block.
          </p>
          <p>
            Only stake in STRK delegation pools is covered. vSTRK, L1 STRK and
            existing delegations are unchanged.
          </p>
          <p v-if="isTestnet">
            This is a prototype on {{ config.name }}. The registry has had an
            automated (AI) review only, not a professional audit.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
