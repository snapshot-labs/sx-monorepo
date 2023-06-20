<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { _n, _c, shorten, sanitizeUrl } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { ETH_CONTRACT } from '@/helpers/constants';
import { NetworkID, Space, Transaction, SelectedStrategy } from '@/types';
import type { Token } from '@/helpers/alchemy';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();
const router = useRouter();
const { copy, copied } = useClipboard();
const { loading, loaded, assets, loadBalances } = useBalances();
const { loading: nftsLoading, loaded: nftsLoaded, nfts, loadNfts } = useNfts();
const { treasury } = useTreasury(toRef(props, 'space'));
const { createDraft } = useEditor();

const page: Ref<'tokens' | 'nfts'> = ref('tokens');
const modalOpen = ref({
  tokens: false,
  nfts: false
});

const currentNetwork = computed(() => {
  if (!props.space.wallet) return null;

  try {
    return getNetwork(props.space.wallet.split(':')[0] as NetworkID);
  } catch (e) {
    return null;
  }
});

const totalQuote = computed(() =>
  assets.value.reduce((acc, asset) => {
    return acc + asset.value;
  }, 0)
);

const sortedAssets = computed(() =>
  (assets || []).value.sort((a, b) => {
    const isEth = (token: Token) => token.contractAddress === ETH_CONTRACT;
    if (isEth(a)) return -1;
    if (isEth(b)) return 1;
    return 0;
  })
);

const treasuryExplorerUrl = computed(() => {
  if (!currentNetwork.value || !treasury.value) return '';

  const url = currentNetwork.value.helpers.getExplorerUrl(treasury.value.wallet, 'address');
  return sanitizeUrl(url);
});

function getExecutionStrategy(): SelectedStrategy | null {
  let executorIndex = props.space.executors.findIndex(
    executorAddress => executorAddress === treasury.value?.wallet
  );

  if (executorIndex === -1) {
    // If the treasury is not an executor, use the first avatar executor
    executorIndex = props.space.executors_types.findIndex(e => e === 'SimpleQuorumAvatar');
  }

  if (executorIndex === -1) return null;

  return {
    address: props.space.executors[executorIndex],
    type: props.space.executors_types[executorIndex]
  };
}

function openModal(type: 'tokens' | 'nfts') {
  modalOpen.value[type] = true;
}

function addTx(tx: Transaction) {
  let executor = props.space.executors.find(e => e === treasury.value?.wallet);
  if (!executor) {
    // If the treasury is not an executor, use the first avatar executor
    const executorIndex = props.space.executors_types.findIndex(e => e === 'SimpleQuorumAvatar');
    executor = props.space.executors[executorIndex];
  }

  const draftId = createDraft(`${props.space.network}:${props.space.id}`, {
    execution: [tx],
    executionStrategy: getExecutionStrategy()
  });
  router.push(`create/${draftId}`);
}

onMounted(() => {
  if (!treasury.value) return;

  loadBalances(treasury.value.wallet, treasury.value.network);
  loadNfts(treasury.value.wallet);
});

watchEffect(() => {
  setTitle(`Treasury - ${props.space.name}`);
});
</script>

<template>
  <div v-if="!treasury || !currentNetwork" class="p-4 flex items-center text-skin-link">
    <IH-exclamation-circle class="inline-block mr-2" />
    No treasury configured.
  </div>
  <template v-else>
    <div class="p-4 space-x-2 flex">
      <div class="flex-auto" />
      <UiTooltip title="Copy address">
        <UiButton class="!px-0 w-[46px]" @click="copy(treasury.wallet)">
          <IH-duplicate v-if="!copied" class="inline-block" />
          <IH-check v-else class="inline-block" />
        </UiButton>
      </UiTooltip>
      <UiTooltip :title="page === 'tokens' ? 'Send token' : 'Send NFT'">
        <UiButton class="!px-0 w-[46px]" @click="openModal(page)">
          <IH-arrow-sm-right class="inline-block -rotate-45" />
        </UiButton>
      </UiTooltip>
    </div>
    <div class="space-y-3">
      <div>
        <Label label="Treasury" sticky />
        <a
          :href="treasuryExplorerUrl || '#'"
          target="_blank"
          class="flex justify-between items-center mx-4 py-3 border-b"
          :class="{
            'pointer-events-none': !treasuryExplorerUrl
          }"
        >
          <Stamp :id="treasury.wallet" type="avatar" :size="32" class="mr-3" />
          <div class="flex-1 leading-[22px]">
            <h4 class="text-skin-link" v-text="shorten(treasury.wallet)" />
            <div class="text-skin-text text-sm" v-text="shorten(treasury.wallet)" />
          </div>
          <h3 v-text="`$${_n(totalQuote.toFixed())}`" />
        </a>
      </div>
      <div>
        <div class="flex pl-4 border-b">
          <Link
            :is-active="page === 'tokens'"
            text="Tokens"
            class="pr-3"
            @click="page = 'tokens'"
          />
          <Link :is-active="page === 'nfts'" text="NFTs" @click="page = 'nfts'" />
        </div>
        <div v-if="page === 'tokens'">
          <UiLoading v-if="loading && !loaded" class="px-4 py-3 block" />
          <div
            v-if="loaded && sortedAssets.length === 0"
            class="px-4 py-3 flex items-center text-skin-link"
          >
            <IH-exclamation-circle class="inline-block mr-2" />
            There are no tokens in treasury.
          </div>
          <a
            v-for="(asset, i) in sortedAssets"
            :key="i"
            :href="
              (asset.contractAddress === ETH_CONTRACT
                ? treasuryExplorerUrl
                : sanitizeUrl(
                    currentNetwork.helpers.getExplorerUrl(asset.contractAddress, 'token')
                  )) || '#'
            "
            target="_blank"
            class="mx-4 py-3 border-b flex"
          >
            <div class="flex-auto flex items-center min-w-0">
              <Stamp :id="asset.contractAddress" type="token" :size="32" />
              <div class="flex flex-col ml-3 leading-[22px] min-w-0 pr-2 md:pr-0">
                <h4 v-text="asset.symbol" />
                <div class="text-sm truncate" v-text="asset.name" />
              </div>
            </div>
            <div
              v-if="asset.price"
              class="flex-col items-end text-right leading-[22px] w-[180px] hidden md:block"
            >
              <h4 class="text-skin-link" v-text="`$${_n(asset.price)}`" />
              <div v-if="asset.change" class="text-sm">
                <div v-if="asset.change > 0" class="text-green" v-text="`+${_n(asset.change)}%`" />
                <div v-if="asset.change < 0" class="text-red" v-text="`${_n(asset.change)}%`" />
              </div>
            </div>
            <div class="flex-col items-end text-right leading-[22px] w-auto md:w-[180px]">
              <h4
                class="text-skin-link"
                v-text="_c(asset.tokenBalance || 0n, asset.decimals || 0)"
              />
              <div v-if="asset.price" class="text-sm" v-text="`$${_n(asset.price)}`" />
            </div>
          </a>
        </div>
        <div v-else-if="page === 'nfts'">
          <div
            v-if="nftsLoaded && nfts.length === 0"
            class="px-4 py-3 flex items-center text-skin-link"
          >
            <IH-exclamation-circle class="inline-block mr-2" />
            There are no NFTs in treasury.
          </div>
          <UiLoading v-if="nftsLoading && !nftsLoaded" class="px-4 py-3 block" />
          <div class="flex flex-row flex-wrap gap-4 p-4">
            <a
              v-for="(nft, i) in nfts"
              :key="i"
              :href="sanitizeUrl(nft.permalink) || '#'"
              target="_blank"
              class="block max-w-[120px]"
            >
              <NftPreview :item="nft" class="w-full" />
              <div class="mt-2 text-sm truncate">{{ nft.displayTitle }}</div>
            </a>
          </div>
        </div>
      </div>
    </div>
    <teleport to="#modal">
      <ModalSendToken
        :open="modalOpen.tokens"
        :address="treasury.wallet"
        :network="treasury.network"
        @close="modalOpen.tokens = false"
        @add="addTx"
      />
      <ModalSendNft
        :open="modalOpen.nfts"
        :address="treasury.wallet"
        @close="modalOpen.nfts = false"
        @add="addTx"
      />
    </teleport>
  </template>
</template>
