<script setup lang="ts">
import { sanitizeUrl } from '@braintree/sanitize-url';
import { useInfiniteQuery } from '@tanstack/vue-query';
import removeMarkdown from 'remove-markdown';
import { getGenericExplorerUrl } from '@/helpers/explorer';
import { getNames } from '@/helpers/stamp';
import { _n, _p, _vp, shorten } from '@/helpers/utils';
import { SNAPSHOT_URLS } from '@/networks/offchain';
import { DelegationType, Space, SpaceMetadataDelegation } from '@/types';

const props = defineProps<{
  space: Space;
  delegation: SpaceMetadataDelegation;
}>();

const delegateModalOpen = ref(false);
const delegateModalState = ref<{ delegatee: string } | null>(null);
const delegatee = ref<{
  id: string;
  balance: bigint | null;
  decimals: number;
  share: number;
  name: string | null;
} | null>(null);
const sortBy = ref(
  'delegatedVotes-desc' as
    | 'delegatedVotes-desc'
    | 'delegatedVotes-asc'
    | 'tokenHoldersRepresentedAmount-desc'
    | 'tokenHoldersRepresentedAmount-asc'
);
const { setTitle } = useTitle();
const { getDelegates, getDelegation } = useDelegates(
  props.delegation.apiType as DelegationType,
  props.delegation.apiUrl as string,
  props.delegation.contractAddress as string,
  props.space
);
const { getDelegatee } = useActions();
const { web3 } = useWeb3();

const spaceKey = computed(() => `${props.space.network}:${props.space.id}`);

const {
  data,
  error,
  fetchNextPage,
  hasNextPage,
  isPending,
  isFetchingNextPage,
  isError
} = useInfiniteQuery({
  initialPageParam: 0,
  queryKey: ['delegates', props.delegation.contractAddress, sortBy],
  queryFn: ({ pageParam }) => {
    const [orderBy, orderDirection] = sortBy.value.split('-');

    return getDelegates({
      orderBy,
      orderDirection,
      first: 40,
      skip: pageParam
    });
  },
  getNextPageParam: (lastPage, pages) => {
    if (lastPage.length < 40) return null;

    return pages.length * 40;
  },
  retry: (failureCount, error) => {
    if (error?.message.includes('Row not found')) return false;

    return failureCount < 3;
  }
});

async function fetchDelegateRegistryDelegatee() {
  const delegation = await getDelegation(web3.value.account);

  if (delegation) {
    const names = await getNames([delegation.delegatee]);

    delegatee.value = {
      id: delegation.delegate,
      balance: 0n,
      decimals: 0,
      share: 0,
      name: names[delegation.delegate]
    };
  } else {
    delegatee.value = null;
  }
}

async function fetchGovernorSubgraphDelegatee() {
  const delegateeData = await getDelegatee(
    props.delegation,
    web3.value.account
  );

  if (delegateeData) {
    const [names, [apiDelegate]] = await Promise.all([
      getNames([delegateeData.address]),
      getDelegates({
        first: 1,
        skip: 0,
        orderBy: 'delegatedVotes',
        orderDirection: 'desc',
        where: {
          user: delegateeData.address
        }
      })
    ]);

    delegatee.value = {
      id: delegateeData.address,
      balance: delegateeData.balance,
      decimals: delegateeData.decimals,
      share: apiDelegate
        ? Number(delegateeData.balance) / Number(apiDelegate.delegatedVotesRaw)
        : 1,
      name: names[delegateeData.address]
    };
  } else {
    delegatee.value = null;
  }
}

async function handleFetchDelegatee() {
  if (!props.delegation.apiType || !props.delegation.chainId) return;

  if (!web3.value.account) {
    delegatee.value = null;
    return;
  }

  if (props.delegation.apiType === 'governor-subgraph') {
    await fetchGovernorSubgraphDelegatee();
  } else if (props.delegation.apiType === 'delegate-registry') {
    await fetchDelegateRegistryDelegatee();
  }
}

function getExplorerUrl(address: string, type: 'address' | 'token') {
  let url: string | null = null;
  if (props.delegation.chainId) {
    url = getGenericExplorerUrl(props.delegation.chainId, address, type);
  } else {
    return null;
  }

  if (!url) return null;

  return sanitizeUrl(url);
}

function handleSortChange(
  type: 'delegatedVotes' | 'tokenHoldersRepresentedAmount'
) {
  if (sortBy.value.startsWith(type)) {
    sortBy.value = sortBy.value.endsWith('desc')
      ? `${type}-asc`
      : `${type}-desc`;
  } else {
    sortBy.value = `${type}-desc`;
  }
}

function handleDelegateClick(delegatee?: string) {
  delegateModalState.value = delegatee ? { delegatee } : null;
  delegateModalOpen.value = true;
}

watch(
  [props.space, () => web3.value.account, () => web3.value.authLoading],
  ([, , authLoading]) => {
    if (authLoading) return;

    handleFetchDelegatee();
  },
  { immediate: true }
);

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
  <UiMessage
    v-if="delegation.apiType === 'split-delegation'"
    :type="'info'"
    class="m-4"
  >
    This space uses the split-delegation feature, which is currently not
    supported on the new interface. You can view the delegates dashboard on the
    <a
      :href="`${SNAPSHOT_URLS[props.space.network]}/#/${props.space.id}/delegates`"
      target="_blank"
      class="inline-flex items-center font-bold"
    >
      previous interface
      <IH-arrow-sm-right class="inline-block -rotate-45" /></a
    >.
  </UiMessage>
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
      <UiTooltip title="Delegate">
        <UiButton class="!px-0 w-[46px]" @click="handleDelegateClick()">
          <IH-user-add class="inline-block" />
        </UiButton>
      </UiTooltip>
    </div>

    <div v-if="delegatee" class="mb-3">
      <UiLabel label="Delegating to" />
      <div class="w-full truncate px-4">
        <div class="flex w-full space-x-3 truncate border-b py-3">
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
              v-if="delegatee.balance"
              class="w-[150px] flex flex-col sm:shrink-0 text-right justify-center leading-[22px] truncate"
            >
              <h4 class="text-skin-link truncate">
                {{
                  _vp(
                    Number(delegatee.balance) / Math.pow(10, delegatee.decimals)
                  )
                }}
                {{ space.voting_power_symbol }}
              </h4>
              <div class="text-[17px]" v-text="_p(delegatee.share)" />
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
                    @click="handleDelegateClick(web3.account)"
                  >
                    <IH-user-remove />
                    Undelegate
                  </button>
                </UiDropdownItem>
              </template>
            </UiDropdown>
          </div>
        </div>
      </div>
    </div>

    <UiLabel label="Delegates" sticky />
    <div class="text-left table-fixed w-full">
      <div
        class="bg-skin-bg border-b sticky top-[112px] lg:top-[113px] z-40 flex w-full font-medium space-x-3 px-4"
      >
        <div
          class="w-[190px] grow sm:grow-0 sm:shrink-0 flex items-center truncate"
        >
          <span class="truncate">Delegatee</span>
        </div>
        <div class="hidden sm:flex grow items-center truncate">
          <span class="truncate">Statement</span>
        </div>
        <button
          type="button"
          class="hidden md:flex w-[120px] shrink-0 items-center justify-end hover:text-skin-link space-x-1 truncate"
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
          class="w-[150px] flex sm:shrink-0 justify-end items-center hover:text-skin-link space-x-1 truncate"
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
          v-if="data?.pages.length === 0 || isError"
          class="px-4 py-3 flex items-center space-x-1"
        >
          <IH-exclamation-circle class="shrink-0" />
          <span v-if="error?.message.includes('Row not found')">
            Delegates are being computed, please come back later.
          </span>
          <span v-else-if="isError">Failed to load delegates.</span>
          <span v-else-if="data?.pages.length === 0">
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
              class="flex w-full space-x-3 truncate"
            >
              <div
                class="flex grow sm:grow-0 sm:shrink-0 items-center w-[190px] py-3 gap-x-3 leading-[22px] truncate"
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
                class="hidden sm:flex items-center grow text-[17px] overflow-hidden leading-[22px] text-skin-heading"
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
                class="hidden md:flex shrink-0 w-[120px] flex-col items-end justify-center leading-[22px] truncate"
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
                class="w-[150px] flex flex-col sm:shrink-0 text-right justify-center leading-[22px] truncate"
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
                      @click="handleDelegateClick(delegate.user)"
                    >
                      <IH-user-add />
                      Delegate
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
    </teleport>
  </template>
</template>
