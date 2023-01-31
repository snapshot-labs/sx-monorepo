<script setup lang="ts">
import { computed } from 'vue';
import { shorten, _d } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const network = computed(() => getNetwork(props.space.network));
</script>

<template>
  <div class="space-y-3">
    <div>
      <Label :label="'Voting'" />
      <div class="mx-4 pt-3">
        <div class="mb-3">
          <div class="s-label !mb-0">Voting delay</div>
          <h4 class="text-skin-link text-md" v-text="_d(space.voting_delay) || 'No delay'" />
        </div>
        <div class="mb-3">
          <div class="s-label !mb-0">Min. voting period</div>
          <h4 class="text-skin-link text-md" v-text="_d(space.min_voting_period) || 'No min.'" />
        </div>
        <div class="mb-3">
          <div class="s-label !mb-0">Max. voting period</div>
          <h4 class="text-skin-link text-md" v-text="_d(space.max_voting_period)" />
        </div>
        <div class="mb-3">
          <div class="s-label !mb-0" v-text="'Proposal threshold'" />
          <h4 class="text-skin-link text-md" v-text="space.proposal_threshold" />
        </div>
        <div class="mb-3">
          <div class="s-label !mb-0" v-text="'Quorum'" />
          <h4 class="text-skin-link text-md" v-text="space.quorum" />
        </div>
      </div>
    </div>

    <div>
      <Label :label="'Controller'" />
      <div class="py-3 mx-4">
        <a :href="`https://goerli.voyager.online/contract/${space.controller}`" target="_blank">
          <Stamp :id="space.controller" type="avatar" :size="18" class="mr-2 rounded-sm" />
          {{ shorten(space.controller) }}
          <IH-external-link class="inline-block" />
        </a>
      </div>
    </div>

    <div>
      <Label :label="'Auth(s)'" />
      <div v-for="(auth, i) in space.authenticators" :key="i" class="mx-4 py-3 border-b">
        <a :href="`https://goerli.voyager.online/contract/${auth}`" target="_blank" class="flex">
          <h4 class="flex-auto" v-text="network.constants.AUTHS[auth]" />
          <div>
            <Stamp :id="auth" type="avatar" :size="18" class="mr-2 rounded-sm" />
            {{ shorten(auth) }} <IH-external-link class="inline-block" />
          </div>
        </a>
      </div>
    </div>

    <div>
      <Label :label="'Strategie(s)'" />
      <div v-for="(strategy, i) in space.strategies" :key="i" class="mx-4 py-3 border-b">
        <a
          :href="`https://goerli.voyager.online/contract/${strategy}`"
          target="_blank"
          class="flex"
        >
          <h4 class="flex-auto" v-text="network.constants.STRATEGIES[strategy]" />
          <div>
            <Stamp :id="strategy" type="avatar" :size="18" class="mr-2 rounded-sm" />
            {{ shorten(strategy) }} <IH-external-link class="inline-block" />
          </div>
        </a>
      </div>
    </div>

    <div>
      <Label :label="'Execution(s)'" />
      <div v-for="(executor, i) in space.executors" :key="i" class="mx-4 py-3 border-b">
        <a
          :href="`https://goerli.voyager.online/contract/${executor}`"
          target="_blank"
          class="flex"
        >
          <h4 class="inline-block mr-3 flex-auto" v-text="network.constants.EXECUTORS[executor]" />
          <div>
            <Stamp :id="executor" type="avatar" :size="18" class="mr-2 rounded-sm" />
            {{ shorten(executor) }} <IH-external-link class="inline-block" />
          </div>
        </a>
      </div>
    </div>
  </div>
</template>
