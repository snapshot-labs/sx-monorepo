<script setup>
import { onMounted, ref } from 'vue';
import { formatUnits } from '@ethersproject/units';
import { getAddress } from '@ethersproject/address';
import snapshot from '@snapshot-labs/snapshot.js';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { _n, shorten } from '@/helpers/utils';

const props = defineProps({
  space: Object
});

const balances = ref({});
const loading = ref(false);

async function getUsdValue(tokens) {
  const addressesStr = tokens.join(',');
  const url = `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${addressesStr}&vs_currencies=usd`;
  const values = await snapshot.utils.getJSON(url);
  return Object.fromEntries(
    Object.entries(values).map(value => [getAddress(value[0]), value[1].usd])
  );
}

const { getProvider, Multicaller } = snapshot.utils;
const network = '1';
const provider = getProvider(network);
const abi = [
  'function getEthBalance(address addr) public view returns (uint256 balance)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)',
  'function symbol() view returns (string)'
];

const tokens = [
  '0xba100000625a3754423978a60c9317c58a424e3D',
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  '0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F',
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
];

onMounted(async () => {
  const treasury = props.space.wallets[0];
  loading.value = true;
  const prices = await getUsdValue(tokens);
  const multi = new Multicaller(network, provider, abi);
  const base = [];
  base.push({
    name: 'Ether',
    symbol: 'ETH',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
  });
  multi.call('[0].balanceFn', networks[network].multicall, 'getEthBalance', [
    treasury
  ]);
  tokens.forEach((token, i) => {
    base[i + 1] = { address: token };
    multi.call(`[${i + 1}].balanceFn`, token, 'balanceOf', [treasury]);
    multi.call(`[${i + 1}].name`, token, 'name');
    multi.call(`[${i + 1}].symbol`, token, 'symbol');
    multi.call(`[${i + 1}].decimals`, token, 'decimals');
  });
  balances.value = (await multi.execute(base)).map(balance => {
    balance.balance = formatUnits(balance.balanceFn, balance.decimals);
    if (prices[balance.address]) {
      balance.price = prices[balance.address];
      balance.value = balance.price * balance.balance;
    }
    console.log('Balance', balance);
    return balance;
  });
  loading.value = false;
});
</script>

<template>
  <Container slim class="space-y-3">
    <div class="x-block">
      <div class="border-b flex px-4 py-2">
        <h4>Wallet(s)</h4>
      </div>
      <a class="px-4 py-3 block">
        <h4>
          <Stamp type="avatar" :id="space.wallets[0]" :size="44" class="mr-2" />
          {{ shorten(space.wallets[0]) }}
          <Icon name="external-link" class="float-right mt-2" />
        </h4>
      </a>
    </div>
    <div class="x-block">
      <div class="border-b flex px-4 py-2">
        <h4>Assets</h4>
      </div>
      <UiLoading v-if="loading" class="px-4 py-3 block" />
      <div
        v-for="(b, i) in balances"
        :key="i"
        class="px-4 py-3 border-b last:border-0 flex"
      >
        <Stamp type="token" :id="b.address" :size="44" class="mr-2" />
        <div class="flex-auto">
          <div class="leading-[24px]">
            <div class="text-md text-skin-link">
              {{ _n(b.balance) }} {{ b.symbol }}
            </div>
            <div v-if="b.value">${{ _n(b.value) }}</div>
          </div>
        </div>
        <Icon name="go" class="mt-3" />
      </div>
    </div>
  </Container>
</template>
