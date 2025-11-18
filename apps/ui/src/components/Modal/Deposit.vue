<script setup lang="ts">
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import QRCode from 'qrcode';
import { getGenericExplorerUrl } from '@/helpers/generic';
import { formatAddress } from '@/helpers/utils';

const props = defineProps<{
  open: boolean;
  address: string;
  chainId: number | string;
}>();

const emit = defineEmits<{
  (e: 'close');
}>();

const { copy, copied } = useClipboard();

const network = computed(() => networks[props.chainId]);

const formattedAddress = computed(() => formatAddress(props.address));

const qrCodeUrl = computedAsync(() => {
  return QRCode.toDataURL(`${formattedAddress.value}`, {
    width: 200,
    margin: 3
  });
});
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3 v-text="'Deposit'" />
    </template>
    <div class="p-4 space-y-1 text-center">
      <UiAlert v-if="!network" type="error">Invalid address</UiAlert>
      <template v-else>
        <img
          :src="qrCodeUrl"
          class="rounded-lg mx-auto mb-4"
          :alt="formattedAddress"
        />
        <h4 v-text="`${network.name} address`" />
        <div class="text-lg break-all" v-text="formattedAddress" />
      </template>
    </div>
    <template #footer>
      <div class="space-y-3">
        <UiButton class="w-full" primary @click="copy(formattedAddress)">
          <IH-duplicate v-if="!copied" />
          <IH-check v-else />
          Copy address
        </UiButton>
        <UiButton
          class="w-full"
          :to="
            getGenericExplorerUrl(chainId, formattedAddress, 'address') || ''
          "
        >
          View on block explorer
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
