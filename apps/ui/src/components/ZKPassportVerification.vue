<script setup lang="ts">
import QRCode from 'qrcode';

const props = defineProps<{
  auctionId: string;
}>();

const { web3Account } = useWeb3();
const { currentTheme } = useTheme();
const { modalAccountOpen } = useModal();
const {
  status,
  isVerified,
  isPending,
  qrCodeUrl,
  attestation,
  error,
  startVerification,
  reset
} = useZKPassport(props.auctionId);

const canvasRef = ref<HTMLCanvasElement | null>(null);

const qrColors = computed(() => ({
  dark: currentTheme.value === 'dark' ? '#ffffff' : '#000000',
  light: currentTheme.value === 'dark' ? '#1c1b20' : '#ffffff'
}));

const statusMessage = computed(
  () =>
    ({
      idle: 'Start verification to participate in this private auction',
      pending: 'Scan the QR code with ZKPassport app',
      scanning: 'Request received, please approve in ZKPassport app',
      generating: 'Generating proof...',
      verified: 'Verification complete! You can now place bids',
      rejected: 'Verification was rejected',
      error: error.value || 'Verification failed'
    })[status.value]
);

watch(
  [qrCodeUrl, qrColors],
  async ([url]) => {
    if (url && canvasRef.value) {
      await QRCode.toCanvas(canvasRef.value, url, {
        width: 256,
        margin: 2,
        color: qrColors.value
      });
    }
  },
  { flush: 'post' }
);
</script>

<template>
  <div class="s-box p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h4 class="font-semibold">ZKPassport Verification</h4>
      <button
        v-if="isVerified"
        type="button"
        class="text-skin-link text-sm"
        @click="reset"
      >
        Reset
      </button>
    </div>

    <div class="text-sm text-skin-text">
      {{ statusMessage }}
    </div>

    <div v-if="status === 'idle'" class="space-y-3">
      <UiButton
        class="w-full"
        primary
        @click="web3Account ? startVerification() : (modalAccountOpen = true)"
      >
        Start Verification
      </UiButton>
    </div>

    <div
      v-else-if="status === 'pending' && qrCodeUrl"
      class="flex flex-col items-center space-y-3"
    >
      <canvas ref="canvasRef" class="rounded-lg" />
      <a
        :href="qrCodeUrl"
        target="_blank"
        class="text-skin-link text-sm hover:underline"
      >
        Open in ZKPassport app
      </a>
    </div>

    <div
      v-else-if="isPending && status !== 'pending'"
      class="flex items-center justify-center py-8"
    >
      <UiLoading />
    </div>

    <div
      v-else-if="isVerified && attestation"
      class="space-y-2 bg-skin-success/10 rounded-lg p-3"
    >
      <div class="flex items-center gap-2 text-skin-success">
        <IH-check-circle :size="20" />
        <span class="font-medium">Verified</span>
      </div>
      <p class="text-xs text-skin-text truncate">
        {{ attestation.uniqueIdentifier.slice(0, 20) }}...
      </p>
    </div>

    <div
      v-else-if="status === 'rejected' || status === 'error'"
      class="space-y-3"
    >
      <div class="bg-skin-danger/10 rounded-lg p-3 text-skin-danger text-sm">
        {{ statusMessage }}
      </div>
      <UiButton class="w-full" @click="reset">Try Again</UiButton>
    </div>
  </div>
</template>
