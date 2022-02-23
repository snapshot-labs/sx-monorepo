<script setup>
import { shorten } from '@/helpers/utils';

defineProps({ space: Object });
</script>

<template>
  <Container class="mb-6">
    <div class="mb-4">
      <div class="mb-3">
        <h3 class="mb-2">Voting</h3>
        <div><b>Delay:</b> {{ space.settings.votingDelay }} hours</div>
        <div><b>Duration:</b> {{ space.settings.votingPeriod }} days</div>
      </div>

      <div class="mb-3">
        <h3 class="mb-2">Proposal threshold</h3>
        <div>{{ space.settings.proposalThreshold }} TOKEN</div>
      </div>

      <h3 class="mb-2">Controller</h3>
      <div class="border rounded-lg mb-4">
        <a class="px-4 py-3 block">
          <Stamp
            :id="space.settings.controller"
            :size="24"
            class="float-left mr-2"
          />
          <h4>{{ shorten(space.settings.controller) }}</h4>
        </a>
      </div>
    </div>

    <div v-if="space.settings.strategies">
      <h3 class="mb-2">Strategie(s)</h3>
      <div class="border rounded-lg mb-4">
        <a
          v-for="(strategy, i) in space.settings.strategies"
          :key="i"
          class="px-4 py-3 block border-b last:border-b-0"
        >
          <div class="float-right">0xeF8...43e7</div>
          <img
            class="inline-block mr-2"
            src="https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png"
            height="24"
            width="24"
          />
          <h4 class="inline-block">{{ strategy }}</h4>
        </a>
      </div>
    </div>

    <h3 class="mb-2">Auth(s)</h3>
    <div class="border rounded-lg mb-4">
      <a
        v-for="(auth, i) in space.settings.auths"
        :key="i"
        class="px-4 py-3 block border-b last:border-b-0"
      >
        <h4 v-text="auth" />
      </a>
    </div>

    <h3 class="mb-2">Execution(s)</h3>
    <div class="border rounded-lg mb-4">
      <a
        v-for="(execution, i) in space.settings.executions"
        :key="i"
        class="px-4 py-3 block border-b last:border-b-0"
      >
        <h4 v-text="execution" />
      </a>
    </div>
  </Container>
</template>
