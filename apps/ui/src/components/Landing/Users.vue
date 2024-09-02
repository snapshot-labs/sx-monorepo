<script setup lang="ts">
const ORGS = [
  'opcollective.eth',
  'blastfoundation.eth',
  'hop.eth',
  'bnbchain-dao.eth',
  'graphprotocol.eth',
  'sandboxdao.eth',
  'status.eth',
  'infinex.eth',
  'linea-build.eth',
  'ilv.eth',
  'arbitrumfoundation.eth',
  'moonbeam-foundation.eth',
  'acrossprotocol.eth',
  'starknet.eth',
  'cakevote.eth',
  'morpho.eth',
  'eulerdao.eth',
  'safe.eth',
  'metislayer2.eth',
  'rocketpool-dao.eth',
  'uma.eth',
  'apecoin.eth',
  'stgdao.eth',
  'cow.eth',
  'paraswap-dao.eth',
  'meritcircle.eth',
  'anglegovernance.eth',
  'doodles.eth',
  'gearbox.eth',
  'superraredao.eth',
  'g-dao.eth',
  'dydxgov.eth',
  'daocity.eth',
  'balancer.eth',
  '0xgov.eth',
  'shapeshiftdao.eth',
  'instadapp-gov.eth',
  'bitdao.eth',
  'aave.eth',
  'cvx.eth',
  '1inch.eth',
  'cabindao.eth',
  'curve.eth',
  'index-coop.eth',
  'gitcoindao.eth',
  'snapshot.dcl.eth',
  'uniswapgovernance.eth',
  'trustwallet',
  'banklessvault.eth',
  'ens.eth',
  'olympusdao.eth',
  'gnosis.eth',
  'lido-snapshot.eth',
  'frax.eth',
  'veyfi.eth',
  'ethenagovernance.eth'
]; //.sort(() => 0.5 - Math.random());
</script>

<template>
  <div class="border-b bg-white">
    <div class="py-6">
      <div class="text-center relative">
        <div
          class="absolute z-10 top-0 bottom-0 left-0 w-[320px] max-w-[20%] bg-gradient-to-r from-white to-white/0"
        />
        <div
          class="absolute z-10 top-0 bottom-0 right-0 w-[320px] max-w-[20%] bg-gradient-to-l from-white to-white/0"
        />
        <div class="relative overflow-hidden h-[60px]">
          <div class="carousel flex space-x-6 justify-center">
            <router-link
              v-for="(org, i) in [...ORGS, ...ORGS]"
              :key="i"
              :to="{ name: 'space-overview', params: { id: `s:${org}` } }"
              class="shrink-0"
            >
              <img
                :src="`https://cdn.stamp.fyi/space/${org}?s=120`"
                class="w-[56px] h-[56px] rounded-full"
              />
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.carousel {
  animation: slide 30s linear infinite;
}

@keyframes slide {
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
}
</style>
