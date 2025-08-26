<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import removeMarkdown from 'remove-markdown';
import { getGenericExplorerUrl } from '@/helpers/generic';
import { _n, _p, _vp, compareAddresses, shorten } from '@/helpers/utils';
import { useDelegateesQuery } from '@/queries/delegatees';
import { useDelegatesQuery } from '@/queries/delegates';
import { Space, SpaceMetadataDelegation } from '@/types';

type SortType = 'delegatedVotes' | 'tokenHoldersRepresentedAmount';

const props = defineProps<{
  space: Space;
  delegation: SpaceMetadataDelegation;
}>();

const delegateModalOpen = ref(false);
const delegateModalState = ref<{
  delegatees: { id: string }[];
}>({
  delegatees: []
});
const isUndelegating = ref(false);
const undelegateFn = ref(undelegate);
const sortBy = ref(
  'delegatedVotes-desc' as
    | 'delegatedVotes-desc'
    | 'delegatedVotes-asc'
    | 'tokenHoldersRepresentedAmount-desc'
    | 'tokenHoldersRepresentedAmount-asc'
);
const { setTitle } = useTitle();
const { web3 } = useWeb3();
const actions = useActions();
const queryClient = useQueryClient();
const { modalAccountOpen } = useModal();

const spaceKey = computed(() => `${props.space.network}:${props.space.id}`);

const {
  data,
  error,
  fetchNextPage,
  hasNextPage,
  isPending,
  isFetchingNextPage,
  isError
} = useDelegatesQuery(
  toRef(props, 'delegation'),
  toRef(props, 'space'),
  sortBy
);

const { data: delegatees, isPending: isPendingDelegatees } = useDelegateesQuery(
  toRef(() => web3.value.account),
  toRef(props, 'space'),
  toRef(props, 'delegation')
);

const isUpdatableDelegation = computed(() => {
  return props.delegation.apiType === 'split-delegation';
});

function getIsSortingDisabled(type: SortType) {
  return (
    props.delegation.apiType === 'split-delegation' &&
    sortBy.value.includes(type)
  );
}

function getExplorerUrl(address: string, type: 'address' | 'token') {
  if (props.delegation.chainId) {
    return getGenericExplorerUrl(props.delegation.chainId, address, type);
  } else {
    return null;
  }
}

function getHasDelegatedTo(delegatee: string): boolean {
  return (
    delegatees.value?.some(d => compareAddresses(d.id, delegatee)) || false
  );
}

function handleSortChange(type: SortType) {
  if (sortBy.value.startsWith(type)) {
    sortBy.value = sortBy.value.endsWith('desc')
      ? `${type}-asc`
      : `${type}-desc`;
  } else {
    sortBy.value = `${type}-desc`;
  }
}

function handleDelegateToggle(newDelegatee?: string) {
  if (!web3.value.account) {
    modalAccountOpen.value = true;
    return;
  }

  if (newDelegatee && getHasDelegatedTo(newDelegatee)) {
    isUndelegating.value = true;
    return;
  }

  delegateModalState.value.delegatees[0] = { id: newDelegatee || '' };
  delegateModalOpen.value = true;
}

function handleUpdateDelegatesClick(newDelegatee?: string) {
  if (!web3.value.account) {
    modalAccountOpen.value = true;
    return;
  }

  delegateModalState.value.delegatees[0] = { id: newDelegatee || '' };
  delegateModalOpen.value = true;
}

async function undelegate() {
  if (
    !props.delegation.apiType ||
    !props.delegation.chainId ||
    !props.delegation.contractAddress
  ) {
    return null;
  }

  return actions.delegate(
    props.space,
    props.delegation.apiType,
    [],
    props.delegation.contractAddress,
    props.delegation.chainId
  );
}

function handleUndelegateConfirmed() {
  queryClient.invalidateQueries({
    queryKey: ['delegates', props.delegation.contractAddress]
  });

  queryClient.invalidateQueries({
    queryKey: [
      'delegatees',
      props.delegation.contractAddress,
      web3.value.account
    ]
  });

  isUndelegating.value = false;
}

function handleUndelegateClick() {
  isUndelegating.value = true;
}

watchEffect(() => setTitle(`Delegates - ${props.space.name}`));
</script>

<template>
  <div
    v-if="!delegation.apiUrl"
    class="px-4 py-3 flex items-center text-skin-link space-x-2"
  >
    <IH-exclamation-circle class="shrink-0" />
    <span>Invalid delegation settings.</span>
  </div>
  <template v-else>
    <div v-if="delegation.contractAddress" class="p-4 space-x-2 flex">
      <UiButton
        v-if="web3.account"
        :to="{
          name: 'space-user-statement',
          params: {
            space: spaceKey,
            user: web3.account
          }
        }"
      >
        Edit my statement
      </UiButton>
      <div class="flex-auto" />
      <UiTooltip
        :title="isUpdatableDelegation ? 'Update delegates' : 'Delegate'"
      >
        <UiButton
          class="!px-0 w-[46px]"
          @click="
            isUpdatableDelegation
              ? handleUpdateDelegatesClick()
              : handleDelegateToggle()
          "
        >
          <IH-user-add class="inline-block" />
        </UiButton>
      </UiTooltip>
    </div>

    <div v-if="web3.account" class="mb-3">
      <UiSectionHeader label="Delegating to" />
      <UiLoading v-if="isPendingDelegatees" class="px-4 py-3 block" />
      <div v-else-if="delegatees?.length" class="w-full truncate px-4">
        <div
          v-for="delegatee in delegatees"
          :key="delegatee.id"
          class="flex w-full space-x-3 truncate border-b py-3"
        >
          <AppLink
            :to="{
              name: 'space-user-statement',
              params: {
                space: spaceKey,
                user: delegatee.id
              }
            }"
            class="w-full flex justify-between items-center"
          >
            <UiStamp :id="delegatee.id" type="avatar" :size="32" class="mr-3" />
            <div class="flex-1 leading-[22px]">
              <h4
                class="text-skin-link"
                v-text="delegatee.name || shorten(delegatee.id)"
              />
              <div
                class="text-skin-text text-[17px]"
                v-text="shorten(delegatee.id)"
              />
            </div>
            <div
              class="w-[150px] flex flex-col sm:shrink-0 text-right justify-center leading-[22px] truncate"
            >
              <h4 class="text-skin-link truncate">
                {{ _vp(delegatee.balance) }}
                {{ space.voting_power_symbol }}
              </h4>
              <div
                class="text-[17px]"
                v-text="_p(delegatee.delegatedVotePercentage)"
              />
            </div>
          </AppLink>
          <div class="flex items-center justify-center">
            <UiDropdown>
              <template #button>
                <UiButton class="!p-0 !border-0 !h-[auto] !bg-transparent">
                  <IH-dots-horizontal class="text-skin-link" />
                </UiButton>
              </template>
              <template #items>
                <UiDropdownItem v-slot="{ active }">
                  <button
                    type="button"
                    class="flex items-center gap-2"
                    :class="{ 'opacity-80': active }"
                    @click="
                      isUpdatableDelegation
                        ? handleUpdateDelegatesClick()
                        : handleUndelegateClick()
                    "
                  >
                    <template v-if="isUpdatableDelegation">
                      <IH-pencil />
                      Edit delegation
                    </template>
                    <template v-else>
                      <IH-user-remove />
                      Undelegate
                    </template>
                  </button>
                </UiDropdownItem>
              </template>
            </UiDropdown>
          </div>
        </div>
      </div>
      <div v-else class="flex space-x-2 border-b py-3 mx-4">
        <IH-exclamation-circle class="shrink-0 mt-[5px]" />
        <div>
          You are not delegating your voting power yet.
          <span v-if="isUpdatableDelegation">
            If you just delegated, it may take up to 5 minutes to show up.
          </span>
        </div>
      </div>
    </div>

    <UiSectionHeader label="Delegates" sticky />
    <div class="text-left table-fixed w-full">
      <div
        class="bg-skin-bg border-b sticky top-[112px] lg:top-[113px] z-40 flex w-full font-medium space-x-3 px-4"
      >
        <div
          class="w-[120px] xs:w-[190px] grow sm:grow-0 sm:shrink-0 flex items-center truncate"
        >
          <span class="truncate">Delegatee</span>
        </div>
        <div class="hidden sm:flex grow items-center truncate">
          <span class="truncate">Statement</span>
        </div>
        <button
          type="button"
          class="hidden md:flex w-[80px] shrink-0 items-center justify-end hover:text-skin-link space-x-1 truncate"
          :class="{
            'hover:text-skin-text': getIsSortingDisabled(
              'tokenHoldersRepresentedAmount'
            )
          }"
          :disabled="getIsSortingDisabled('tokenHoldersRepresentedAmount')"
          @click="handleSortChange('tokenHoldersRepresentedAmount')"
        >
          <span class="truncate">Delegators</span>
          <IH-arrow-sm-down
            v-if="sortBy === 'tokenHoldersRepresentedAmount-desc'"
            class="shrink-0"
          />
          <IH-arrow-sm-up
            v-else-if="sortBy === 'tokenHoldersRepresentedAmount-asc'"
            class="shrink-0"
          />
        </button>
        <button
          type="button"
          class="w-[120px] md:w-[150px] flex sm:shrink-0 justify-end items-center hover:text-skin-link space-x-1 truncate"
          :class="{
            'hover:text-skin-text': getIsSortingDisabled('delegatedVotes')
          }"
          :disabled="getIsSortingDisabled('delegatedVotes')"
          @click="handleSortChange('delegatedVotes')"
        >
          <span class="truncate">Voting power</span>
          <IH-arrow-sm-down
            v-if="sortBy === 'delegatedVotes-desc'"
            class="shrink-0"
          />
          <IH-arrow-sm-up
            v-else-if="sortBy === 'delegatedVotes-asc'"
            class="shrink-0"
          />
        </button>
        <div class="w-[20px]" />
      </div>
      <UiLoading v-if="isPending" class="px-4 py-3 block" />
      <template v-else>
        <div
          v-if="data?.pages.flat().length === 0 || isError"
          class="px-4 py-3 flex items-center space-x-1"
        >
          <IH-exclamation-circle class="shrink-0" />
          <span v-if="error?.message.includes('Row not found')">
            Delegates are being computed, please come back later.
          </span>
          <span v-else-if="isError">Failed to load delegates.</span>
          <span v-else-if="data?.pages.flat().length === 0">
            There are no delegates.</span
          >
        </div>
        <UiContainerInfiniteScroll
          :loading-more="isFetchingNextPage"
          @end-reached="hasNextPage && fetchNextPage()"
        >
          <div
            v-for="(delegate, i) in data?.pages.flat()"
            :key="i"
            class="border-b flex space-x-3 px-4"
          >
            <AppLink
              :to="{
                name: 'space-user-statement',
                params: {
                  space: spaceKey,
                  user: delegate.user
                }
              }"
              class="flex w-full space-x-3"
            >
              <div
                class="flex grow sm:grow-0 sm:shrink-0 items-center w-[120px] xs:w-[190px] py-3 gap-x-3 leading-[22px] truncate"
              >
                <UiStamp :id="delegate.user" :size="32" />
                <div class="flex flex-col truncate">
                  <h4
                    class="text-skin-link truncate"
                    v-text="delegate.name || shorten(delegate.user)"
                  />
                  <div
                    class="text-[17px] text-skin-text truncate"
                    v-text="shorten(delegate.user)"
                  />
                </div>
              </div>
              <div
                class="hidden sm:flex items-center grow w-0 text-[17px] leading-[22px] text-skin-heading"
              >
                <div
                  v-if="delegate.statement"
                  class="line-clamp-2 max-h-[44px]"
                  v-text="
                    shorten(removeMarkdown(delegate.statement.statement), 250)
                  "
                />
              </div>
              <div
                class="hidden md:flex shrink-0 w-[80px] flex-col items-end justify-center leading-[22px] truncate"
              >
                <h4
                  class="text-skin-link"
                  v-text="_n(delegate.tokenHoldersRepresentedAmount)"
                />
                <div
                  class="text-[17px]"
                  v-text="_p(delegate.delegatorsPercentage)"
                />
              </div>
              <div
                class="w-[120px] md:w-[150px] flex flex-col sm:shrink-0 text-right justify-center leading-[22px] truncate"
              >
                <h4 class="text-skin-link truncate">
                  {{ _vp(Number(delegate.delegatedVotes)) }}
                  {{ space.voting_power_symbol }}
                </h4>
                <div
                  class="text-[17px]"
                  v-text="_p(delegate.votesPercentage)"
                />
              </div>
            </AppLink>
            <div class="flex items-center justify-center">
              <UiDropdown>
                <template #button>
                  <UiButton class="!p-0 !border-0 !h-[auto] !bg-transparent">
                    <IH-dots-horizontal class="text-skin-link" />
                  </UiButton>
                </template>
                <template #items>
                  <UiDropdownItem v-slot="{ active }">
                    <button
                      type="button"
                      class="flex items-center gap-2"
                      :class="{ 'opacity-80': active }"
                      @click="
                        isUpdatableDelegation
                          ? handleUpdateDelegatesClick(delegate.user)
                          : handleDelegateToggle(delegate.user)
                      "
                    >
                      <template v-if="getHasDelegatedTo(delegate.user)">
                        <template v-if="isUpdatableDelegation">
                          <IH-pencil />
                          Edit delegation
                        </template>
                        <template v-else>
                          <IH-user-remove />
                          Undelegate
                        </template>
                      </template>
                      <template v-else>
                        <IH-user-add />
                        Delegate
                      </template>
                    </button>
                  </UiDropdownItem>
                  <UiDropdownItem v-slot="{ active }">
                    <AppLink
                      :to="{
                        name: 'space-user-statement',
                        params: {
                          space: spaceKey,
                          user: delegate.user
                        }
                      }"
                      class="flex items-center gap-2"
                      :class="{ 'opacity-80': active }"
                    >
                      <IH-user-circle />
                      View profile
                    </AppLink>
                  </UiDropdownItem>
                  <UiDropdownItem v-slot="{ active }">
                    <a
                      :href="getExplorerUrl(delegate.user, 'address') || ''"
                      target="_blank"
                      class="flex items-center gap-2"
                      :class="{ 'opacity-80': active }"
                    >
                      <IH-arrow-sm-right class="-rotate-45" />
                      View on block explorer
                    </a>
                  </UiDropdownItem>
                </template>
              </UiDropdown>
            </div>
          </div>
          <template #loading>
            <UiLoading class="px-4 py-3 block" />
          </template>
        </UiContainerInfiniteScroll>
      </template>
    </div>

    <teleport to="#modal">
      <ModalDelegate
        :open="delegateModalOpen"
        :space="space"
        :delegation="delegation"
        :initial-state="delegateModalState"
        @close="delegateModalOpen = false"
      />
      <ModalTransactionProgress
        v-if="delegation.chainId"
        :open="isUndelegating"
        :chain-id="delegation.chainId"
        :execute="undelegateFn"
        @confirmed="handleUndelegateConfirmed"
        @close="isUndelegating = false"
        @cancelled="isUndelegating = false"
      />
    </teleport>
  </template>
</template>
