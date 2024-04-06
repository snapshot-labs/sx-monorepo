<script setup lang="ts">
import { _n, _c, shorten, sanitizeUrl, compareAddresses } from '@/helpers/utils';
import { getNetwork, evmNetworks } from '@/networks';
import { ETH_CONTRACT } from '@/helpers/constants';
import { Contact, Space, SpaceMetadataTreasury, Transaction } from '@/types';
import type { Token } from '@/helpers/alchemy';

const props = defineProps<{
  space: Space;
  treasuryData: SpaceMetadataTreasury;
  extraContacts?: Contact[];
}>();

const { setTitle } = useTitle();
const router = useRouter();
const { copy, copied } = useClipboard();
const { loading, loaded, assets, loadBalances } = useBalances();
const { loading: nftsLoading, loaded: nftsLoaded, nfts, loadNfts } = useNfts();
const { treasury } = useTreasury(props.treasuryData);
const { createDraft } = useEditor();

const page: Ref<'tokens' | 'nfts'> = ref('tokens');
const modalOpen = ref({
  tokens: false,
  nfts: false,
  walletConnectLink: false
});

const currentNetworkId = computed(() => {
  try {
    return treasury.value?.networkId;
  } catch (e) {
    return null;
  }
});

const currentNetwork = computed(() => {
  if (!currentNetworkId.value) return null;

  return getNetwork(currentNetworkId.value);
});

const spaceKey = computed(() => `${props.space.network}:${props.space.id}`);

const isReadOnly = computed(() => {
  return !props.space.executors_strategies.find(
    strategy =>
      strategy.treasury &&
      strategy.treasury_chain &&
      treasury.value &&
      compareAddresses(strategy.treasury, treasury.value.wallet) &&
      strategy.treasury_chain === treasury.value.network
  );
});

const totalQuote = computed(() =>
  assets.value.reduce((acc, asset) => {
    return acc + asset.value;
  }, 0)
);

const totalPreviousQuote = computed(() =>
  assets.value.reduce((acc, asset) => {
    return acc + asset.value / (1 + asset.change / 100);
  }, 0)
);

const totalChange = computed(() => {
  if (totalPreviousQuote.value === 0) return 0;
  return ((totalQuote.value - totalPreviousQuote.value) / totalPreviousQuote.value) * 100;
});

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

const executionStrategy = computed(() => {
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
});

function openModal(type: 'tokens' | 'nfts') {
  modalOpen.value[type] = true;
}

function addTx(tx: Transaction) {
  const draftId = createDraft(spaceKey.value, {
    execution: [tx],
    executionStrategy: executionStrategy.value
  });
  router.push(`create/${draftId}`);
}

onMounted(() => {
  if (!treasury.value) return;

  loadBalances(treasury.value.wallet, treasury.value.network);
  loadNfts(treasury.value.wallet, treasury.value.network);
});

watchEffect(() => setTitle(`Treasury - ${props.space.name}`));
</script>

<template>
  <div v-if="!treasury || !currentNetwork" class="p-4 flex items-center text-skin-link">
    <IH-exclamation-circle class="inline-block mr-2" />
    No treasury configured.
  </div>
  <template v-else>
    <div class="p-4 space-x-2 flex">
      <div class="flex-auto" />

      <UiTooltip
        v-if="currentNetworkId && evmNetworks.includes(currentNetworkId) && !isReadOnly"
        title="Connect to apps"
      >
        <UiButton class="!px-0 w-[46px]" @click="modalOpen.walletConnectLink = true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="480"
            height="332"
            viewBox="0 0 480 332"
            class="inline-block w-[26px] h-[26px]"
          >
            <path
              fill="rgba(var(--link))"
              d="m126.613 93.9842c62.622-61.3123 164.152-61.3123 226.775 0l7.536 7.3788c3.131 3.066 3.131 8.036 0 11.102l-25.781 25.242c-1.566 1.533-4.104 1.533-5.67 0l-10.371-10.154c-43.687-42.7734-114.517-42.7734-158.204 0l-11.107 10.874c-1.565 1.533-4.103 1.533-5.669 0l-25.781-25.242c-3.132-3.066-3.132-8.036 0-11.102zm280.093 52.2038 22.946 22.465c3.131 3.066 3.131 8.036 0 11.102l-103.463 101.301c-3.131 3.065-8.208 3.065-11.339 0l-73.432-71.896c-.783-.767-2.052-.767-2.835 0l-73.43 71.896c-3.131 3.065-8.208 3.065-11.339 0l-103.4657-101.302c-3.1311-3.066-3.1311-8.036 0-11.102l22.9456-22.466c3.1311-3.065 8.2077-3.065 11.3388 0l73.4333 71.897c.782.767 2.051.767 2.834 0l73.429-71.897c3.131-3.065 8.208-3.065 11.339 0l73.433 71.897c.783.767 2.052.767 2.835 0l73.431-71.895c3.132-3.066 8.208-3.066 11.339 0z"
            />
          </svg>
        </UiButton>
      </UiTooltip>
      <UiTooltip title="Copy address">
        <UiButton class="!px-0 w-[46px]" @click="copy(treasury.wallet)">
          <IH-duplicate v-if="!copied" class="inline-block" />
          <IH-check v-else class="inline-block" />
        </UiButton>
      </UiTooltip>
      <UiTooltip v-if="!isReadOnly" :title="page === 'tokens' ? 'Send token' : 'Send NFT'">
        <UiButton class="!px-0 w-[46px]" @click="openModal(page)">
          <IH-arrow-sm-right class="inline-block -rotate-45" />
        </UiButton>
      </UiTooltip>
    </div>
    <div class="space-y-3">
      <div>
        <UiLabel label="Treasury" sticky />
        <a
          :href="treasuryExplorerUrl || '#'"
          target="_blank"
          class="flex justify-between items-center mx-4 py-3 border-b"
          :class="{
            'pointer-events-none': !treasuryExplorerUrl
          }"
        >
          <UiBadgeNetwork :id="treasury.networkId" class="mr-3">
            <UiStamp :id="treasury.wallet" type="avatar" :size="32" class="rounded-md" />
          </UiBadgeNetwork>
          <div class="flex-1 leading-[22px]">
            <h4 class="text-skin-link" v-text="treasury.name || shorten(treasury.wallet)" />
            <div class="text-skin-text text-[17px]" v-text="shorten(treasury.wallet)" />
          </div>
          <div v-if="loaded" class="flex-col items-end text-right leading-[22px]">
            <h4
              class="text-skin-link"
              v-text="`$${_n(totalQuote, 'standard', { maximumFractionDigits: 2 })}`"
            />
            <div v-if="Math.abs(totalChange) > 0.01" class="text-[17px]">
              <div
                v-if="totalChange > 0"
                class="text-skin-success"
                v-text="`+${_n(totalChange, 'standard', { maximumFractionDigits: 2 })}%`"
              />
              <div
                v-if="totalChange < 0"
                class="text-skin-danger"
                v-text="`${_n(totalChange, 'standard', { maximumFractionDigits: 2 })}%`"
              />
            </div>
          </div>
        </a>
      </div>
      <div>
        <div class="flex pl-4 border-b space-x-3">
          <button type="button" @click="page = 'tokens'">
            <UiLink :is-active="page === 'tokens'" text="Tokens" />
          </button>
          <button type="button" @click="page = 'nfts'">
            <UiLink :is-active="page === 'nfts'" text="NFTs" />
          </button>
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
              <UiBadgeNetwork :id="treasury.networkId" class="mr-3">
                <UiStamp
                  :id="`${treasury.networkId}:${asset.contractAddress}`"
                  type="token"
                  :size="32"
                />
              </UiBadgeNetwork>
              <div class="flex flex-col ml-3 leading-[22px] min-w-0 pr-2 md:pr-0">
                <h4 class="truncate" v-text="asset.symbol" />
                <div class="text-[17px] truncate text-skin-text" v-text="asset.name" />
              </div>
            </div>
            <div
              v-if="asset.price"
              class="flex-col items-end text-right leading-[22px] w-[240px] hidden md:block"
            >
              <h4
                class="text-skin-link"
                v-text="`$${_n(asset.price, 'standard', { maximumFractionDigits: 2 })}`"
              />
              <div v-if="asset.change" class="text-[17px]">
                <div
                  v-if="asset.change > 0"
                  class="text-skin-success"
                  v-text="`+${_n(asset.change, 'standard', { maximumFractionDigits: 2 })}%`"
                />
                <div
                  v-if="asset.change < 0"
                  class="text-skin-danger"
                  v-text="`${_n(asset.change, 'standard', { maximumFractionDigits: 2 })}%`"
                />
              </div>
            </div>
            <div class="flex-col items-end text-right leading-[22px] w-auto md:w-[240px]">
              <h4
                class="text-skin-link truncate"
                v-text="
                  `${_c(asset.tokenBalance || 0n, asset.decimals || 0)} ${shorten(
                    asset.symbol,
                    'symbol'
                  )}`
                "
              />
              <div
                v-if="asset.value"
                class="text-[17px] text-skin-text"
                v-text="`$${_n(asset.value, 'standard', { maximumFractionDigits: 2 })}`"
              />
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
              <UiNftImage :item="nft" class="w-full" />
              <div class="mt-2 text-[17px] truncate">{{ nft.displayTitle }}</div>
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
        :network-id="treasury.networkId"
        :extra-contacts="extraContacts"
        @close="modalOpen.tokens = false"
        @add="addTx"
      />
      <ModalSendNft
        :open="modalOpen.nfts"
        :address="treasury.wallet"
        :network="treasury.network"
        :extra-contacts="extraContacts"
        @close="modalOpen.nfts = false"
        @add="addTx"
      />
      <ModalLinkWalletConnect
        :open="modalOpen.walletConnectLink"
        :address="treasury.wallet"
        :network="treasury.network"
        :network-id="treasury.networkId"
        :space-key="spaceKey"
        :execution-strategy="executionStrategy"
        @close="modalOpen.walletConnectLink = false"
      />
    </teleport>
  </template>
</template>
