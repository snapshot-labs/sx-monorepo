<script setup lang="ts">
import { formatUnits } from '@ethersproject/units';
import { _n, shorten } from '@/helpers/utils';
import { Transaction } from '@/types';

defineProps<{ tx: Transaction }>();

function getTitle(tx: Transaction) {
  if (tx._type === 'sendToken') {
    return `Send <b>${_n(formatUnits(tx._form.amount, tx._form.token.decimals))}</b> ${
      tx._form.token.symbol
    } to <b>${shorten(tx._form.recipient)}</b>`;
  }

  if (tx._type === 'sendNft') {
    return `Send <b>${_n(formatUnits(tx._form.amount, 0))}</b> NFT to <b>${shorten(
      tx._form.recipient
    )}</b>`;
  }

  if (tx._type === 'contractCall') {
    return `Contract call to <b>${shorten(tx._form.recipient)}</b>`;
  }
}
</script>

<template>
  <div class="border-b last:border-b-0 px-4 py-3 space-x-2 flex items-center justify-between">
    <div class="flex items-center max-w-[70%]">
      <slot name="left" />
      <IH-cash v-if="tx._type === 'sendToken'" />
      <IH-photograph v-else-if="tx._type === 'sendNft'" />
      <IH-code v-else />
      <div class="ml-2 truncate text-skin-link" v-html="getTitle(tx)" />
    </div>
    <slot name="right" />
  </div>
</template>
