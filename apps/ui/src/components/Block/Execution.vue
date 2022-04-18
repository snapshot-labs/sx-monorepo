<script setup>
import { shorten } from '@/helpers/utils';
import { formatUnits } from '@ethersproject/units';
import { Interface } from '@ethersproject/abi';

defineProps({ txs: Array });

function decodeTx(tx) {
  const iface = new Interface(tx.abi);
  const decodedTx = JSON.parse(JSON.stringify(iface.parseTransaction(tx)));
  decodedTx.to = tx.to;
  return decodedTx;
}

function decodeTxs(txs) {
  return txs.map(tx => decodeTx(tx));
}
</script>
<template>
  <div class="x-block">
    <h4 class="px-4 py-3 border-b">
      <IH-code class="inline-block mr-2" /> Execution
      <UiCounter :counter="txs.length" class="float-right mt-1" />
    </h4>
    <div>
      <div v-if="txs.length > 0">
        <div
          v-for="(tx, i) in decodeTxs(txs)"
          :key="i"
          class="border-b last:border-b-0 px-4 py-3"
        >
          <h4>
            <IH-document-text class="inline-block mr-1" />
            {{ shorten(tx.to) }}
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
      <div v-else class="px-4 py-3">There isn't any execution set.</div>
    </div>
  </div>
</template>
