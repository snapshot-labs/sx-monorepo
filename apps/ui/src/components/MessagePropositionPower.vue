<script setup lang="ts">
import { _n, _vp, prettyConcat } from '@/helpers/utils';
import { PropositionPowerItem } from '@/queries/propositionPower';
import { VoteValidationPowerItem } from '@/queries/voteValidationPower';

type Strategy = PropositionPowerItem['strategies'][0];

const props = defineProps<{
  propositionPower: PropositionPowerItem | VoteValidationPowerItem;
}>();

const actionName = computed(() => {
  return 'canPropose' in props.propositionPower ? 'create a proposal' : 'vote';
});

const thresholdDecimals = computed(() =>
  Math.max(
    ...props.propositionPower.strategies.map(s => s.params.decimals ?? 0)
  )
);

const offchainErrors = computed(() => ({
  'only-members': () =>
    `You need to be a member of the space in order to ${actionName.value}.`,
  basic: (strategy: Strategy) =>
    `You need at least ${_n(strategy.params.minScore, 'compact')} ${prettySymbolsList(
      strategy.params.strategies.map(
        (s: { params: { symbol?: string } }) =>
          s.params.symbol || props.propositionPower.symbol
      )
    )} to ${actionName.value}.`,
  'passport-gated': (strategy: Strategy) =>
    `You need a Gitcoin Passport with ${strategy.params.operator === 'AND' ? 'all' : 'one'} of the following stamps to ${actionName.value}: ${prettyConcat(strategy.params.stamps, strategy.params.operator === 'AND' ? 'and' : 'or')}.`,
  'karma-eas-attestation': () =>
    `You need to be attested by Karma EAS to ${actionName.value}.`
}));

type OffchainValidationName = keyof typeof offchainErrors.value;

const LINKS: Partial<
  Record<OffchainValidationName, { label: string; url: string }>
> = {
  'passport-gated': {
    label: 'Gitcoin Passport',
    url: 'https://passport.gitcoin.co/#/dashboard'
  }
};

const offchainStrategy = computed(() => {
  const strategy = props.propositionPower.strategies[0];
  const name = strategy.name as OffchainValidationName;

  if (offchainErrors.value[name]) {
    return { ...strategy, name };
  }

  return null;
});

const offchainLink = computed(() =>
  offchainStrategy.value ? LINKS[offchainStrategy.value.name] : undefined
);

function prettySymbolsList(symbols: string[]): string {
  return prettyConcat(Array.from(new Set(symbols)));
}
</script>

<template>
  <UiAlert type="error" v-bind="$attrs">
    <template v-if="offchainStrategy">
      {{ offchainErrors[offchainStrategy.name](offchainStrategy) }}
      <AppLink v-if="offchainLink" :to="offchainLink.url">
        {{ offchainLink.label }}
        <IH-arrow-sm-right class="inline-block -rotate-45" />
      </AppLink>
    </template>
    <template v-else>
      You need at least
      {{ _vp(Number(propositionPower.threshold) / 10 ** thresholdDecimals) }}
      {{
        prettySymbolsList(
          propositionPower.strategies.map(
            s => s.params.symbol || propositionPower.symbol
          )
        )
      }}
      to {{ actionName }}.
    </template>
  </UiAlert>
</template>
