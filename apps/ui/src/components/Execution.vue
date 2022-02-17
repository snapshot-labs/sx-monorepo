<script setup>
import { shorten } from '@/helpers/utils';
import { formatUnits } from '@ethersproject/units';
import { Interface } from '@ethersproject/abi';
import execution from '@/helpers/execution.json';

let txs = execution[0].txs[0].transactions;
txs = txs.map(tx => decodeTxs(tx));

function decodeTxs(tx) {
  const iface = new Interface(tx.abi);
  const decodedTx = JSON.parse(JSON.stringify(iface.parseTransaction(tx)));
  decodedTx.to = tx.to;
  return decodedTx;
}
</script>
<template>
  <h4 class="px-4 py-3">
    <Icon name="play" class="mr-2" /> Execution
    <UiCounter :counter="2" class="float-right mt-1" />
  </h4>
  <div>
    <div v-for="(tx, i) in txs" :key="i" class="border-t px-4 py-3">
      <h4>
        <Icon name="receipt-outlined" class="mr-2" /> {{ shorten(tx.to) }}
      </h4>
      <span class="s-label !inline-block">{{ tx.name }} ( </span>
      <span class="space-x-2 inline-block">
        <span
          v-for="(input, i2) in tx.functionFragment.inputs"
          :key="input.name"
          class="s-label !inline-block"
        >
          {{ input.name }}
          <span class="inline-block">
            <h4 v-if="input.type === 'address'" class="inline-block">
              {{ shorten(tx.args[i2]) }}
            </h4>
            <h4 v-if="input.type === 'uint256'" class="inline-block">
              {{ formatUnits(tx.args[i2]) }}
            </h4>
          </span>
        </span>
      </span>
      <span>)</span>
    </div>
  </div>
</template>
