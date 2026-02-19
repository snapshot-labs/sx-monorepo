<script setup lang="ts">
import { formatUnits } from '@ethersproject/units';
import { getGenericExplorerUrl } from '@/helpers/generic';
import { getNames } from '@/helpers/stamp';
import { _n, shorten } from '@/helpers/utils';
import { ChainId, Transaction } from '@/types';

const props = defineProps<{ chainId: ChainId; tx: Transaction }>();

const expanded = ref(false);

const title = computed(() => {
  if (props.tx._type === 'sendToken') {
    return `Send <b>${_n(formatUnits(props.tx._form.amount, props.tx._form.token.decimals), 'standard', { formatDust: true })}</b> ${
      props.tx._form.token.symbol
    } to <b>_NAME_</b>`;
  }

  if (props.tx._type === 'sendNft') {
    return `Send <b>${_n(formatUnits(props.tx._form.amount, 0))}</b> NFT to <b>_NAME_</b>`;
  }

  if (props.tx._type === 'stakeToken') {
    return `Stake <b>${_n(formatUnits(props.tx.value, 18), 'standard', { formatDust: true })} ETH</b> with <b>Lido</b>`;
  }

  if (props.tx._type === 'contractCall') {
    return `<b>${props.tx._form.method.split('(')[0]}</b> on <b>_NAME_</b>`;
  }

  if (props.tx._type === 'raw') {
    return 'Raw transaction to <b>_NAME_</b>';
  }

  return '';
});

const interaction = computed(() => {
  if (props.tx._type === 'sendToken' && props.tx.data === '0x') {
    return { to: props.tx.to, type: 'send' };
  }

  if (props.tx._type === 'raw') {
    return { to: props.tx.to, type: 'raw' };
  }

  return null;
});

const call = computed(() => {
  if (props.tx._type === 'sendToken') {
    if (props.tx.data === '0x') return null;

    return { name: 'transfer', to: props.tx.to };
  }

  if (props.tx._type === 'sendNft') {
    return { name: 'safeTransferFrom', to: props.tx.to };
  }

  if (props.tx._type === 'stakeToken') {
    return { name: 'submit', to: props.tx.to };
  }

  if (props.tx._type === 'contractCall') {
    return { name: props.tx._form.method.split('(')[0], to: props.tx.to };
  }

  return null;
});

const params = computed(() => {
  if (props.tx._type === 'sendToken' && props.tx.data !== '0x') {
    return [
      { name: 'recipient', value: props.tx._form.recipient, type: 'address' },
      { name: 'amount', value: props.tx._form.amount, type: 'raw' }
    ];
  }

  if (props.tx._type === 'sendNft') {
    const payload = [
      { name: 'from', value: props.tx._form.sender, type: 'address' },
      { name: 'to', value: props.tx._form.recipient, type: 'address' },
      { name: 'tokenId', value: props.tx._form.nft.id, type: 'raw' }
    ];

    if (props.tx._form.nft.type === 'erc1155') {
      payload.push({
        name: 'amount',
        value: props.tx._form.amount,
        type: 'raw'
      });
      payload.push({
        name: 'data',
        value: '0',
        type: 'raw'
      });
    }

    return payload;
  }

  if (props.tx._type === 'stakeToken') {
    return [
      { name: 'referral', value: props.tx._form.args.referral, type: 'address' }
    ];
  }

  if (props.tx._type === 'contractCall') {
    return Object.entries(props.tx._form.args).map(([name, value]) => {
      return {
        name,
        value,
        type: 'raw'
      };
    });
  }

  return [];
});

const value = computed(() => {
  if (props.tx.value !== '0') {
    return props.tx.value;
  }

  return null;
});

const data = computed(() => {
  if (props.tx._type === 'raw') {
    return props.tx.data;
  }

  return null;
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
  <div class="w-full border-b last:border-b-0">
    <button
      class="w-full px-4 py-3 gap-2 flex items-center"
      @click="expanded = !expanded"
    >
      <div v-if="$slots.left" class="shrink-0">
        <slot name="left" />
      </div>
      <div class="flex gap-2 truncate items-center flex-auto">
        <IH-cash v-if="tx._type === 'sendToken'" class="shrink-0" />
        <IH-photograph v-else-if="tx._type === 'sendNft'" class="shrink-0" />
        <IC-stake v-else-if="tx._type === 'stakeToken'" class="shrink-0" />
        <IH-code v-else class="shrink-0" />
        <div class="truncate text-skin-link" v-html="parsedTitle" />
      </div>
      <slot name="right" />
    </button>
    <div v-if="expanded" class="border-y last:border-b-0 px-4 py-3">
      <div v-if="call" class="text-skin-link">
        Call
        <code class="bg-skin-border px-2 py-1 mx-1 text-sm">{{
          call.name
        }}</code>
        on
        <AppLink
          class="inline-flex items-center"
          :to="getGenericExplorerUrl(chainId, call.to, 'address') || undefined"
        >
          {{ shorten(call.to) }}
          <IH-arrow-sm-right class="inline-block ml-1 -rotate-45" />
        </AppLink>
      </div>
      <div v-else-if="interaction" class="text-skin-link">
        Interaction with
        <AppLink
          class="inline-flex items-center"
          :to="
            getGenericExplorerUrl(chainId, interaction.to, 'address') ||
            undefined
          "
        >
          {{ shorten(interaction.to) }}
          <IH-arrow-sm-right class="inline-block ml-1 -rotate-45" />
        </AppLink>
      </div>
      <template v-if="params.length > 0">
        <h4 class="font-medium mt-3">Parameters</h4>
        <div v-for="param in params" :key="param.name" class="flex space-x-2">
          <span class="text-skin-link">{{ param.name }}</span>
          <AppLink
            v-if="param.type === 'address'"
            class="inline-flex items-center"
            :to="
              getGenericExplorerUrl(chainId, param.value, 'address') ||
              undefined
            "
          >
            {{ shorten(param.value) }}
            <IH-arrow-sm-right class="inline-block ml-1 -rotate-45" />
          </AppLink>
          <div v-else class="break-all inline-block">{{ param.value }}</div>
        </div>
      </template>
      <div v-if="value" class="mt-3">
        <h4 class="font-medium">Value</h4>
        <div>{{ value }}</div>
      </div>
      <div v-if="data" class="mt-3">
        <h4 class="font-medium">Data</h4>
        <div class="break-all">{{ data }}</div>
      </div>
    </div>
  </div>
</template>
