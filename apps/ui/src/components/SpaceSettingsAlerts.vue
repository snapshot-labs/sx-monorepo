<script setup lang="ts">
import { prettyConcat } from '@/helpers/utils';
import { Space } from '@/types';

const props = defineProps<{ space: Space; activeTab: string }>();

const { alerts } = useSpaceAlerts(toRef(props, 'space'));

const unsupportedProOnlyStrategies = computed(
  () =>
    alerts.value
      .get('HAS_PRO_ONLY_STRATEGIES')
      ?.strategies.map((s: string) => `"${s}"`) || []
);

const unsupportedProOnlyNetworks = computed(
  () =>
    alerts.value
      .get('HAS_PRO_ONLY_NETWORKS')
      ?.networks.map((s: any) => `"${s.name}"`) || []
);

const deprecatedStrategies = computed(
  () =>
    alerts.value
      .get('HAS_DEPRECATED_STRATEGIES')
      ?.strategies.map((s: string) => `"${s}"`) || []
);

const disabledStrategies = computed(
  () =>
    alerts.value
      .get('HAS_DISABLED_STRATEGIES')
      ?.strategies.map((s: string) => `"${s}"`) || []
);

const hasVotingStrategiesAlerts = computed(
  () =>
    props.activeTab === 'voting-strategies' &&
    (unsupportedProOnlyStrategies.value.length > 0 ||
      deprecatedStrategies.value.length > 0 ||
      disabledStrategies.value.length > 0 ||
      unsupportedProOnlyNetworks.value.length > 0)
);

const isRelayerBalanceLow = computed(() =>
  alerts.value.has('IS_RELAYER_BALANCE_LOW')
);

const isRelayerBalanceInsufficient = computed(() =>
  alerts.value.has('IS_RELAYER_BALANCE_INSUFFICIENT')
);

const isUsingOnlyInoperativeSigAuthenticators = computed(
  () =>
    alerts.value.get('IS_SIG_AUTHENTICATOR_INOPERATIVE')
      ?.isUsingOnlySigAuthenticators
);

const hasWhitelabelAlerts = computed(
  () =>
    props.activeTab === 'whitelabel' &&
    alerts.value.has('HAS_PRO_ONLY_WHITELABEL')
);

const hasAuthenticatorsAlerts = computed(
  () =>
    props.activeTab === 'authenticators' &&
    (isRelayerBalanceLow.value ||
      isRelayerBalanceInsufficient.value ||
      isUsingOnlyInoperativeSigAuthenticators.value)
);

const hasAnyAlerts = computed(
  () =>
    hasVotingStrategiesAlerts.value ||
    hasWhitelabelAlerts.value ||
    hasAuthenticatorsAlerts.value
);
</script>

<template>
  <div v-if="hasAnyAlerts" class="space-y-2" v-bind="$attrs">
    <template v-if="hasVotingStrategiesAlerts">
      <UiAlert v-if="deprecatedStrategies.length" type="error">
        The {{ prettyConcat(deprecatedStrategies, 'and') }}
        {{ deprecatedStrategies.length > 1 ? 'strategies are' : 'strategy is' }}
        deprecated and no longer supported.
        <AppLink
          to="https://help.snapshot.box/en/articles/11638664-migrating-from-multichain-voting-strategy"
        >
          See migration guide
        </AppLink>
      </UiAlert>
      <UiAlert v-if="disabledStrategies.length" type="error">
        The {{ prettyConcat(disabledStrategies, 'and') }}
        {{ disabledStrategies.length > 1 ? 'strategies are' : 'strategy is' }}
        no longer available.
        <AppLink
          to="https://help.snapshot.box/en/articles/11638664-migrating-from-multichain-voting-strategy"
          class="font-semibold text-rose-500"
        >
          See migration guide
        </AppLink>
      </UiAlert>
      <UiAlert v-if="unsupportedProOnlyStrategies.length" type="error">
        The
        {{ prettyConcat(unsupportedProOnlyStrategies, 'and') }}
        {{
          unsupportedProOnlyStrategies.length > 1
            ? 'strategies require'
            : 'strategy requires'
        }}
        Snapshot Pro.
        <AppLink :to="{ name: 'space-pro' }">Upgrade to Pro</AppLink>
        or
        <AppLink
          to="https://help.snapshot.box/en/articles/11568442-migrating-from-delegation-to-with-delegation-strategy"
        >
          follow migration guide
        </AppLink>
      </UiAlert>
      <UiAlert v-if="unsupportedProOnlyNetworks.length" type="error">
        The
        {{ prettyConcat(unsupportedProOnlyNetworks, 'and') }}
        {{ unsupportedProOnlyNetworks.length > 1 ? 'networks' : 'network' }}
        used by your space and/or its strategies require{{
          unsupportedProOnlyNetworks.length > 1 ? '' : 's'
        }}
        Snapshot Pro.
        <AppLink :to="{ name: 'space-pro' }">Upgrade to Pro</AppLink>
        or
        <AppLink
          to="https://help.snapshot.box/en/articles/10478752-what-are-the-premium-networks"
        >
          change to a premium network
        </AppLink>
      </UiAlert>
    </template>
    <template v-if="hasAuthenticatorsAlerts">
      <UiAlert v-if="isRelayerBalanceLow" type="error">
        Your relayer balance is running low. Please top up to keep gasless
        voting active.
      </UiAlert>
      <UiAlert v-if="isRelayerBalanceInsufficient" type="error">
        Your relayer balance is depleted. Gasless voting is disabled until you
        top up.
      </UiAlert>
      <UiAlert v-if="isUsingOnlyInoperativeSigAuthenticators" type="error">
        Top up your relayer account to enable gasless voting, or add another
        authenticator.
      </UiAlert>
    </template>
    <template v-if="hasWhitelabelAlerts">
      <UiAlert type="error">
        Custom domain requires Snapshot Pro.
        <AppLink :to="{ name: 'space-pro' }">Upgrade to Pro</AppLink>
        or
        <AppLink
          to="https://help.snapshot.box/en/articles/11661865-migrating-from-using-a-whitelabel"
        >
          follow migration guide
        </AppLink>
      </UiAlert>
    </template>
  </div>
</template>
