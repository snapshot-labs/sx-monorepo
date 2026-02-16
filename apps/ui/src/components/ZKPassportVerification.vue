<script setup lang="ts">
import QRCode from 'qrcode';
import { VerificationStatus } from '@/helpers/auction/types';

const props = defineProps<{
  status: VerificationStatus;
  verificationUrl: string;
}>();

const STATUS_MESSAGES = {
  scanning: {
    title: 'Approve in app',
    description: 'Confirm the request in your ZKPassport app'
  },
  generating: {
    title: 'Generating proof',
    description: 'This may take a moment...'
  }
};

const statusMessage = computed(() => STATUS_MESSAGES[props.status]);

const qrCodeUrl = computedAsync(async () => {
  if (props.status !== 'pending' || !props.verificationUrl) return '';

  try {
    return await QRCode.toDataURL(props.verificationUrl, {
      errorCorrectionLevel: 'H',
      width: 280,
      margin: 4
    });
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    return '';
  }
}, '');
</script>

<template>
  <div>
    <div
      v-if="status === 'pending'"
      class="flex flex-col items-center text-center p-4 space-y-4"
    >
      <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="QR Code" class="rounded-xl" />
      <div class="space-y-1">
        <p class="text-sm text-skin-text">
          Scan with the ZKPassport app to continue
        </p>
        <AppLink
          :to="verificationUrl"
          class="text-skin-link text-sm hover:underline"
        >
          Open in app
        </AppLink>
      </div>
    </div>

    <div
      v-else-if="statusMessage"
      class="flex flex-col items-center text-center p-6 space-y-3"
    >
      <div class="bg-skin-border rounded-full p-3">
        <UiLoading :size="24" />
      </div>
      <div class="space-y-1">
        <h4 class="font-semibold">{{ statusMessage.title }}</h4>
        <p class="text-sm text-skin-text">
          {{ statusMessage.description }}
        </p>
      </div>
    </div>
  </div>
</template>
