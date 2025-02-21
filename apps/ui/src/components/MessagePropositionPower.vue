<script setup lang="ts">
import { _n } from '@/helpers/utils';
import { PropositionPowerItem } from '@/queries/propositionPower';

type Strategy = PropositionPowerItem['strategies'][0];

const props = defineProps<{
  propositionPower: PropositionPowerItem;
}>();

const ERRORS = {
  // Offchain strategies
  'only-members': () =>
    'You need to be a core member of the space in order to submit a proposal.',
  basic: (strategy: Strategy) =>
    `You do not meet the minimum balance requirement of ${_n(strategy.params.minScore, 'compact')} ${props.propositionPower.symbol} to create a proposal.`,
  'passport-gated': (strategy: Strategy) =>
    `You need a Gitcoin Passport with ${strategy.params.operator === 'AND' ? 'all' : 'one'} of the following stamps to create a proposal: ${strategy.params.stamps.join(', ')}.`,
  'passport-weighted': () => '',
  'karma-eas-attestation': () =>
    'You need to be attested by Karma EAS to create a proposal.',
  arbitrum: () =>
    'You do not have the required minimum of ARB tokens to create a proposal.',
  // Onchain strategies
  Whitelist: (strategy: Strategy) =>
    `You need to be whitelisted with at least ${props.propositionPower.threshold} ${strategy.params.symbol} to create a proposal.`
} as const;

const LINKS = {
  'passport-gated': {
    label: 'Gitcoin Passport',
    url: 'https://passport.gitcoin.co/#/dashboard'
  },
  'passport-weighted': {
    label: 'Gitcoin Passport',
    url: 'https://passport.gitcoin.co/#/dashboard'
  }
} as const;
</script>

<template>
  <div v-bind="$attrs" class="flex border border-skin-danger/40 rounded-lg">
    <div class="p-[14px] bg-skin-danger-active text-skin-danger shrink-0">
      <IH-exclamation-circle />
    </div>
    <ul class="px-3 py-2.5 leading-[22px]">
      <li v-for="(strategy, index) in propositionPower.strategies" :key="index">
        <template v-if="ERRORS[strategy.name]">
          {{ ERRORS[strategy.name](strategy) }}
          <AppLink v-if="LINKS[strategy.name]" :to="LINKS[strategy.name].url">
            {{ LINKS[strategy.name].label }}
            <IH-arrow-sm-right class="inline-block -rotate-45" />
          </AppLink>
        </template>
        <template v-else> {{ strategy.name }}: {{ strategy.params }} </template>
      </li>
    </ul>
  </div>
</template>
