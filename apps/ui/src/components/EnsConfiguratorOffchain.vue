<script lang="ts" setup>
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

const spaceId = defineModel<string>();

const emit = defineEmits<{
  (e: 'select');
}>();

const props = defineProps<{
  networkId: NetworkID;
}>();

const {
  MAX_ENS_NAME_LENGTH,
  isRefreshing,
  isLoading,
  hasError,
  names,
  load,
  refresh
} = useWalletEns(props.networkId);
const { web3 } = useWeb3();
const { modalAccountOpen } = useModal();

const validNames = computed(() => {
  return Object.values(names.value || {}).filter(d => d.status === 'AVAILABLE');
});

const invalidNames = computed(() => {
  return Object.values(names.value || {}).filter(
    d => !['AVAILABLE', 'USED'].includes(d.status)
  );
});

const isTestnet = computed(() => {
  return getNetwork(props.networkId).name.includes('testnet');
});

const ENS_URL = computed(() =>
  isTestnet.value
    ? 'https://sepolia.app.ens.domains'
    : 'https://app.ens.domains'
);

function handleSelect(value: string) {
  spaceId.value = value;
  emit('select');
}
</script>

<template>
  <div v-if="hasError" class="flex flex-col gap-3 items-start">
    <UiAlert type="error">
      An error happened while fetching the ENS names associated to your wallet.
      Please try again
    </UiAlert>
    <UiButton
      class="flex items-center gap-2"
      :loading="isRefreshing"
      @click="load"
    >
      <IH-refresh />
      Retry
    </UiButton>
  </div>
  <div v-else class="space-y-4">
    <div class="space-y-2">
      <div>
        To create a space, you need an ENS name on
        {{ isTestnet ? 'Sepolia testnet' : 'Ethereum mainnet' }}.
      </div>
      <UiMessage v-if="!isTestnet" type="info">
        Still experimenting?
        <br />
        You can also try
        <AppLink to="https://testnet.snapshot.box/#/create">
          testnet.snapshot.box
        </AppLink>
        - a Sepolia testnet playground dedicated to testing before creating your
        space or proposals on Snapshot.
      </UiMessage>
    </div>
    <div v-if="web3.account" class="space-y-4">
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <h4 class="eyebrow">ENS names</h4>
          <UiButton
            v-if="names"
            class="flex items-center gap-1 !text-skin-text !p-0 !border-0 !h-auto !w-auto"
            :disabled="isLoading"
            :loading="isRefreshing"
            @click="refresh"
          >
            <IH-refresh class="h-[16px]" />
            Refresh
          </UiButton>
        </div>
        <UiLoading
          v-if="(isLoading && !isRefreshing) || !names"
          class="block"
        />
        <div v-else-if="Object.keys(names).length" class="space-y-2">
          <UiSelector
            v-for="name in validNames"
            :key="name.name"
            :is-active="spaceId === name.name"
            class="w-full"
            @click="() => handleSelect(name.name)"
          >
            <div class="flex gap-2 items-center text-skin-link">
              <IH-Globe-alt class="shrink-0" />
              {{ name.name }}
            </div>
          </UiSelector>
          <UiSelector
            v-for="name in invalidNames"
            :key="name.name"
            :disabled="true"
            class="w-full"
          >
            <div class="flex gap-2 items-top">
              <IH-Exclamation class="mt-[5px] text-skin-danger shrink-0" />
              <div class="flex flex-col">
                <div class="text-skin-danger" v-text="name.name" />
                <div v-if="name.status === 'TOO_LONG'">
                  ENS name is too long. It must be less than
                  {{ MAX_ENS_NAME_LENGTH }} characters
                </div>
                <div v-else-if="name.status === 'DELETED'">
                  ENS name was used by a previously deleted space and can not be
                  reused to create a new space.
                  <AppLink
                    to="https://docs.snapshot.box/faq/im-a-snapshot-user/space-settings#why-cant-i-create-a-new-space-with-my-previous-deleted-space-ens-name"
                    class="text-skin-link"
                  >
                    Learn more
                    <IH-arrow-sm-right class="-rotate-45 inline" />
                  </AppLink>
                </div>
              </div>
            </div>
          </UiSelector>
          <UiMessage
            v-if="!validNames.length && !invalidNames.length"
            type="danger"
          >
            No more ENS names available for space creation found.
          </UiMessage>
        </div>
        <UiMessage v-else type="danger">
          No ENS names found for the current wallet.
        </UiMessage>
        <AppLink :to="ENS_URL" class="inline-block">
          Register a new ENS name
          <IH-arrow-sm-right class="-rotate-45 inline" />
        </AppLink>
      </div>
      <div class="space-y-3">
        <h4 class="eyebrow">Controller</h4>
        <UiMessage type="info">
          By default, the ENS domain’s controller is its owner. You can change
          it later in your space setting.</UiMessage
        >
        <FormSpaceController
          :controller="web3.account"
          :network="getNetwork(networkId)"
          :disabled="true"
        />
      </div>
    </div>
    <UiMessage v-else type="danger">
      <button class="text-skin-link" @click="modalAccountOpen = true">
        Connect your wallet
      </button>
      in order to see your ENS names
    </UiMessage>
  </div>
</template>
