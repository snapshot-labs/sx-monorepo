<script setup lang="ts">
import { _n, prettyConcat } from '@/helpers/utils';
import { PropositionPowerItem } from '@/queries/propositionPower';

type Strategy = PropositionPowerItem['strategies'][0];

const props = defineProps<{
  propositionPower: PropositionPowerItem;
}>();

const OFFCHAIN_ERRORS = {
  'only-members': () =>
    'You need to be a core member of the space in order to submit a proposal.',
  basic: (strategy: Strategy) =>
    `You need at least ${_n(strategy.params.minScore, 'compact')} ${props.propositionPower.symbol} to create a proposal.`,
  'passport-gated': (strategy: Strategy) =>
    `You need a Gitcoin Passport with ${strategy.params.operator === 'AND' ? 'all' : 'one'} of the following stamps to create a proposal: ${prettyConcat(strategy.params.stamps, strategy.params.operator === 'AND' ? 'and' : 'or')}.`,
  'passport-weighted': () => '',
  'karma-eas-attestation': () =>
    'You need to be attested by Karma EAS to create a proposal.',
  arbitrum: () =>
    'You do not have the required minimum of ARB tokens to create a proposal.'
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

const offchainStrategy = computed(() => {
  const name = props.propositionPower.strategies[0].name;

  if (OFFCHAIN_ERRORS[name]) {
    return props.propositionPower.strategies[0];
  }

  return null;
});
</script>

<template>
  <div v-bind="$attrs" class="flex border border-skin-danger/40 rounded-lg">
    <div class="p-[14px] bg-skin-danger-active text-skin-danger shrink-0">
      <IH-exclamation-circle />
    </div>
    <div class="px-3 py-2.5 leading-[22px]">
      <template v-if="offchainStrategy">
        {{ OFFCHAIN_ERRORS[offchainStrategy.name](offchainStrategy) }}
        <AppLink
          v-if="LINKS[offchainStrategy.name]"
          :to="LINKS[offchainStrategy.name].url"
        >
          {{ LINKS[offchainStrategy.name].label }}
          <IH-arrow-sm-right class="inline-block -rotate-45" />
        </AppLink>
      </template>
      <template v-else>
        You need at least {{ _n(propositionPower.threshold) }}
        {{
          prettyConcat(
            propositionPower.strategies.map(
              s => s.params.symbol || propositionPower.symbol
            )
          )
        }}
        to create a proposal.
      </template>
    </div>
  </div>
</template>
