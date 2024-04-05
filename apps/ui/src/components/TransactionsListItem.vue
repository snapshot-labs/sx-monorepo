<script setup lang="ts">
import { formatUnits } from '@ethersproject/units';
import { _n, shorten } from '@/helpers/utils';
import { getNames } from '@/helpers/stamp';
import { Transaction } from '@/types';

const props = defineProps<{ tx: Transaction }>();

const title = computed(() => {
  if (props.tx._type === 'sendToken') {
    return `Send <b>${_n(formatUnits(props.tx._form.amount, props.tx._form.token.decimals))}</b> ${
      props.tx._form.token.symbol
    } to <b>_NAME_</b>`;
  }

  if (props.tx._type === 'sendNft') {
    return `Send <b>${_n(formatUnits(props.tx._form.amount, 0))}</b> NFT to <b>_NAME_</b>`;
  }

  if (props.tx._type === 'contractCall') {
    return `Contract call to <b>_NAME_</b>`;
  }

  return '';
});

const parsedTitle = computedAsync(
  async () => {
    const { recipient } = props.tx._form;
    const names = await getNames([recipient]);
    const name = names[recipient] || shorten(recipient);

    return title.value.replace('_NAME_', name);
  },
  title.value.replace('_NAME_', shorten(props.tx._form.recipient))
);
</script>

<template>
  <div class="border-b last:border-b-0 px-4 py-3 space-x-2 flex items-center justify-between">
    <div class="flex items-center max-w-[70%]">
      <slot name="left" />
      <IH-cash v-if="tx._type === 'sendToken'" />
      <IH-photograph v-else-if="tx._type === 'sendNft'" />
      <IH-code v-else />
      <div class="ml-2 truncate text-skin-link" v-html="parsedTitle" />
    </div>
    <slot name="right" />
  </div>
</template>
