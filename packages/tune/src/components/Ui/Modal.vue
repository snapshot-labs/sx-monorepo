<script setup lang="ts">
import { Dialog, DialogContent, DialogTitle } from '@ui-sdk/vue/dialog';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

withDefaults(
  defineProps<{
    open: boolean;
    closeable?: boolean;
  }>(),
  {
    closeable: true
  }
);

// Wallet modals open over ours: these stay usable when already on the page
// (WalletConnect, Coinbase, Starknet). Sequence opens a window instead.
const WALLET_MODALS = [
  'w3m-modal',
  '.-cbwsdk-css-reset',
  '#starknetkit-modal-container',
  '#argent-mobile-modal-container',
  '#argent-mobile-modal-overlay',
  '#argent-webwallet-modal'
];
</script>

<template>
  <!-- Rendered in place, under wallet modals. Only the backdrop closes it
  on a click, so a click in a wallet modal over it doesn't. -->
  <Dialog
    :open="open"
    :dismissible="closeable"
    :close-on-outside-press="false"
    :persistent-elements="WALLET_MODALS"
    @update:open="emit('close')"
  >
    <!-- Focus goes to the modal itself, so no button shows a focus ring -->
    <DialogContent
      inline
      initial-focus="content"
      class="modal mx-auto pt-electron-titlebar-height outline-none"
      data-testid="modal"
    >
      <div class="backdrop" @click="closeable ? emit('close') : null" />
      <div class="shell overflow-hidden relative rounded-none md:rounded-lg">
        <DialogTitle v-if="$slots.header">
          <template #render="{ props: titleProps }">
            <div
              v-bind="titleProps"
              class="border-b py-3 text-center"
              data-testid="modal-header"
            >
              <slot name="header" />
            </div>
          </template>
        </DialogTitle>
        <div class="modal-body" data-testid="modal-body">
          <slot />
        </div>
        <div
          v-if="$slots.footer"
          class="border-t p-4 text-center"
          data-testid="modal-footer"
        >
          <slot name="footer" />
        </div>
        <button
          v-if="closeable"
          type="button"
          class="absolute right-0 -top-1 p-4"
          aria-label="Close modal"
          @click="emit('close')"
        >
          <IH-x />
        </button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style lang="scss">
.modal {
  position: fixed;
  display: flex;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  align-items: center;
  justify-content: center;
  z-index: 51;

  .backdrop {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 99;
    background: rgba(0, 0, 0, 0.4);
    @media (max-width: 767px) {
      background: transparent;
    }
  }

  .shell {
    border: 1px solid rgba(var(--border));
    background-color: rgba(var(--bg));
    padding-left: 0 !important;
    padding-right: 0 !important;
    max-width: 440px;
    overflow-y: auto !important;
    max-height: calc(100vh - 120px);
    display: flex;
    flex-direction: column;
    z-index: 999;
    margin: 0 auto;
    width: 100%;

    @media (max-width: 767px) {
      border: 0;
      width: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      min-height: 100% !important;
      margin-bottom: 0 !important;

      .modal-body {
        max-height: 100% !important;
      }
    }

    .modal-body {
      max-height: 420px;
      flex: auto;
      text-align: initial;
      overflow-y: auto;
      overflow-x: hidden;
    }
  }
}
</style>
