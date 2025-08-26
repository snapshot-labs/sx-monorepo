<script setup lang="ts">
import { ETH_CONTRACT } from '@/helpers/constants';
import { _c, _n, sanitizeUrl, shorten } from '@/helpers/utils';
import { enabledNetworks, evmNetworks, getNetwork } from '@/networks';
import {
  ChainId,
  Contact,
  Space,
  SpaceMetadataTreasury,
  Transaction
} from '@/types';

const STAKING_CHAIN_IDS: ChainId[] = [1, 11155111];
const EVM_CHAIN_IDS: ChainId[] = evmNetworks
  .filter(network => enabledNetworks.includes(network))
  .map(network => getNetwork(network).chainId);

const props = defineProps<{
  space: Space;
  treasuryData: SpaceMetadataTreasury;
  extraContacts?: Contact[];
}>();

const { setTitle } = useTitle();
const route = useRoute();
const router = useRouter();
const { copy, copied } = useClipboard();
const { treasury, getExplorerUrl } = useTreasury(props.treasuryData);
const { strategiesWithTreasuries } = useTreasuries(props.space);
const { createDraft } = useEditor();

const balancesTreasury = computed(() => {
  if (!treasury.value?.network) return null;

  return {
    chainId: treasury.value.network,
    address: treasury.value.wallet
  };
});
const { isPending, isSuccess, isError, assets } = useBalances({
  treasury: balancesTreasury
});
const {
  isPending: isNftsPending,
  isSuccess: isNftsSuccess,
  isError: isNftsError,
  nfts
} = useNfts({
  treasury: balancesTreasury
});

const page: Ref<'tokens' | 'nfts'> = computed(() => {
  return route.params.tab === 'nfts' ? 'nfts' : 'tokens';
});
const modalOpen = ref({
  tokens: false,
  nfts: false,
  stake: false,
  walletConnectLink: false
});

const spaceKey = computed(() => `${props.space.network}:${props.space.id}`);
const executionStrategy = computed(
  () =>
    strategiesWithTreasuries.value?.find(
      strategy => strategy.treasury.address === treasury.value?.wallet
    ) ?? null
);
const isReadOnly = computed(
  () =>
    executionStrategy.value === null ||
    !treasury.value?.supportsTokens ||
    !treasury.value?.supportsNfts
);

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
  return (
    ((totalQuote.value - totalPreviousQuote.value) / totalPreviousQuote.value) *
    100
  );
});

const treasuryExplorerUrl = computed(() => {
  if (!treasury.value) return '';

  return getExplorerUrl(treasury.value.wallet, 'address') || '';
});

const hasStakeableAssets = computed(() => {
  return (
    treasury.value &&
    !isReadOnly.value &&
    assets.value.some(asset => asset.contractAddress === ETH_CONTRACT) &&
    STAKING_CHAIN_IDS.includes(treasury.value.network)
  );
});

function openModal(type: 'tokens' | 'nfts' | 'stake') {
  modalOpen.value[type] = true;
}

async function addTx(tx: Transaction) {
  const executions = {} as Record<string, Transaction[]>;
  if (executionStrategy.value) {
    executions[executionStrategy.value.address] = [tx];
  }

  const draftId = await createDraft(spaceKey.value, {
    executions
  });
  router.push({
    name: 'space-editor',
    params: { key: draftId }
  });
}

watchEffect(() => setTitle(`Treasury - ${props.space.name}`));
</script>

<template>
  <div v-if="!treasury" class="p-4 flex items-center text-skin-link space-x-2">
    <IH-exclamation-circle class="inline-block shrink-0" />
    <span>No treasury configured.</span>
  </div>
  <template v-else>
    <div class="p-4 space-x-2 flex">
      <div class="flex-auto" />

      <UiTooltip
        v-if="!isReadOnly && EVM_CHAIN_IDS.includes(treasury.network)"
        title="Connect to apps"
      >
        <UiButton
          class="!px-0 w-[46px]"
          @click="modalOpen.walletConnectLink = true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="480"
            height="332"
            viewBox="0 0 480 332"
            class="inline-block size-[26px]"
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
      <UiTooltip
        v-if="!isReadOnly"
        :title="page === 'tokens' ? 'Send token' : 'Send NFT'"
      >
        <UiButton class="!px-0 w-[46px]" @click="openModal(page)">
          <IH-arrow-sm-right class="inline-block -rotate-45" />
        </UiButton>
      </UiTooltip>
    </div>
    <div class="space-y-3">
      <div>
        <UiSectionHeader label="Treasury" sticky />
        <a
          :href="treasuryExplorerUrl || '#'"
          target="_blank"
          class="flex justify-between items-center mx-4 py-3 border-b"
          :class="{
            'pointer-events-none': !treasuryExplorerUrl
          }"
        >
          <UiBadgeNetwork :chain-id="treasury.network" class="mr-3">
            <UiStamp
              :id="treasury.wallet"
              type="avatar"
              :size="32"
              class="rounded-md"
            />
          </UiBadgeNetwork>
          <div class="flex-1 leading-[22px]">
            <h4
              class="text-skin-link"
              v-text="treasury.name || shorten(treasury.wallet)"
            />
            <div
              class="text-skin-text text-[17px]"
              v-text="shorten(treasury.wallet)"
            />
          </div>
          <div
            v-if="isSuccess"
            class="flex-col items-end text-right leading-[22px]"
          >
            <h4
              class="text-skin-link"
              v-text="
                `$${_n(totalQuote, 'standard', { maximumFractionDigits: 2 })}`
              "
            />
            <div v-if="Math.abs(totalChange) > 0.01" class="text-[17px]">
              <div
                v-if="totalChange > 0"
                class="text-skin-success"
                v-text="
                  `+${_n(totalChange, 'standard', { maximumFractionDigits: 2 })}%`
                "
              />
              <div
                v-if="totalChange < 0"
                class="text-skin-danger"
                v-text="
                  `${_n(totalChange, 'standard', { maximumFractionDigits: 2 })}%`
                "
              />
            </div>
          </div>
        </a>
      </div>
      <div>
        <div class="flex pl-4 border-b space-x-3">
          <AppLink
            :to="{
              params: {
                tab: 'tokens'
              }
            }"
          >
            <UiLabel :is-active="page === 'tokens'" text="Tokens" />
          </AppLink>
          <AppLink
            :to="{
              params: {
                tab: 'nfts'
              }
            }"
          >
            <UiLabel :is-active="page === 'nfts'" text="NFTs" />
          </AppLink>
        </div>
        <div
          v-if="
            (page === 'tokens' && !treasury.supportsTokens) ||
            (page === 'nfts' && !treasury.supportsNfts)
          "
          class="p-4 flex items-center text-skin-link space-x-2"
        >
          <IH-exclamation-circle class="inline-block shrink-0" />
          <span>This treasury network is not supported.</span>
        </div>
        <div v-else-if="page === 'tokens'">
          <UiLoading v-if="isPending" class="px-4 py-3 block" />
          <div
            v-else-if="isSuccess && assets.length === 0"
            class="px-4 py-3 flex items-center text-skin-link space-x-2"
          >
            <IH-exclamation-circle class="inline-block shrink-0" />
            <span>There are no tokens in treasury.</span>
          </div>
          <div
            v-else-if="isError"
            class="px-4 py-3 flex items-center text-skin-link space-x-2"
          >
            <IH-exclamation-circle class="inline-block shrink-0" />
            <span>Failed to load treasury tokens.</span>
          </div>
          <a
            v-for="(asset, i) in assets"
            v-else
            :key="i"
            :href="
              asset.contractAddress === ETH_CONTRACT
                ? treasuryExplorerUrl
                : getExplorerUrl(asset.contractAddress, 'token') || '#'
            "
            target="_blank"
            class="mx-4 py-3 border-b flex"
          >
            <div class="flex-auto flex items-center min-w-0 space-x-3">
              <UiBadgeNetwork :chain-id="treasury.network">
                <UiStamp
                  :id="`eip155:${treasury.network}:${asset.contractAddress}`"
                  type="token"
                  :size="32"
                />
              </UiBadgeNetwork>
              <div class="flex flex-col leading-[22px] min-w-0 pr-2 md:pr-0">
                <h4 class="truncate" v-text="asset.symbol" />
                <div
                  class="text-[17px] truncate text-skin-text"
                  v-text="asset.name"
                />
              </div>
              <UiTooltip
                v-if="
                  asset.contractAddress === ETH_CONTRACT && hasStakeableAssets
                "
                title="Stake with Lido"
              >
                <UiButton
                  class="!px-0 w-[46px]"
                  @click.prevent="openModal('stake')"
                >
                  <IC-stake class="inline-block" />
                </UiButton>
              </UiTooltip>
            </div>
            <div
              v-if="asset.price"
              class="flex-col items-end text-right leading-[22px] w-[240px] hidden md:block"
            >
              <h4
                class="text-skin-link"
                v-text="
                  `$${_n(asset.price, 'standard', { maximumFractionDigits: 2 })}`
                "
              />
              <div v-if="asset.change" class="text-[17px]">
                <div
                  v-if="asset.change > 0"
                  class="text-skin-success"
                  v-text="
                    `+${_n(asset.change, 'standard', { maximumFractionDigits: 2 })}%`
                  "
                />
                <div
                  v-if="asset.change < 0"
                  class="text-skin-danger"
                  v-text="
                    `${_n(asset.change, 'standard', { maximumFractionDigits: 2 })}%`
                  "
                />
              </div>
            </div>
            <div
              class="flex-col items-end text-right leading-[22px] w-auto md:w-[240px]"
            >
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
                v-text="
                  `$${_n(asset.value, 'standard', { maximumFractionDigits: 2 })}`
                "
              />
            </div>
          </a>
        </div>
        <div v-else-if="page === 'nfts'">
          <div
            v-if="isNftsSuccess && nfts.length === 0"
            class="px-4 py-3 flex items-center text-skin-link space-x-2"
          >
            <IH-exclamation-circle class="inline-block shrink-0" />
            <span>There are no NFTs in treasury.</span>
          </div>
          <div
            v-else-if="isNftsError"
            class="px-4 py-3 flex items-center text-skin-link space-x-2"
          >
            <IH-exclamation-circle class="inline-block shrink-0" />
            <span>Failed to load treasury NFTs.</span>
          </div>
          <UiLoading v-if="isNftsPending" class="px-4 py-3 block" />
          <div
            class="grid grid-cols-1 minimum:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 3xl:grid-cols-9 gap-4 gap-y-2 max-w-fit mx-auto p-4"
          >
            <a
              v-for="(nft, i) in nfts"
              :key="i"
              :href="sanitizeUrl(nft.opensea_url) || '#'"
              target="_blank"
              class="block w-full minimum:max-w-[160px] md:max-w-[120px] mx-auto shrink-0"
            >
              <UiNftImage :item="nft" class="w-full" />
              <div class="mt-2 text-[17px] truncate text-center">
                {{ nft.displayTitle }}
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
    <teleport to="#modal">
      <ModalSendToken
        v-if="!isReadOnly && treasury.supportsTokens"
        :open="modalOpen.tokens"
        :address="treasury.wallet"
        :network="treasury.network"
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
      <ModalStakeToken
        v-if="hasStakeableAssets"
        :open="modalOpen.stake"
        :address="treasury.wallet"
        :network="treasury.network"
        @close="modalOpen.stake = false"
        @add="addTx"
      />
      <ModalLinkWalletConnect
        v-if="executionStrategy"
        :open="modalOpen.walletConnectLink"
        :address="treasury.wallet"
        :network="treasury.network"
        :network-id="space.network"
        :space-key="spaceKey"
        :execution-strategy="executionStrategy"
        @close="modalOpen.walletConnectLink = false"
      />
    </teleport>
  </template>
</template>
