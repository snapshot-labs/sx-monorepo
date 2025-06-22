<script setup lang="ts">
import { SPACE_ALERTS } from '@/helpers/constants';
import { prettyConcat } from '@/helpers/utils';
import { Space } from '@/types';

const props = defineProps<{ space: Space; activeTab: string }>();

const { isController, isAdmin } = useSpaceSettings(toRef(props, 'space'));
const { alerts } = useSpaceAlerts(toRef(props, 'space'));

const isSpaceAdmin = computed(() => isController.value || isAdmin.value);

const unsupportedProOnlyStrategies = computed(
  () =>
    alerts.value
      .get(SPACE_ALERTS.STRATEGIES_PRO_ONLY)
      ?.strategies.map(s => `"${s}"`) || []
);

const unsupportedProOnlyNetworks = computed(
  () =>
    alerts.value
      .get(SPACE_ALERTS.NETWORKS_PRO_ONLY)
      ?.networks.map(s => `"${s.name}"`) || []
);

const deprecatedStrategies = computed(
  () =>
    alerts.value
      .get(SPACE_ALERTS.STRATEGIES_DEPRECATED)
      ?.strategies.map(s => `"${s}"`) || []
);

const hasAlerts = computed(
  () =>
    unsupportedProOnlyStrategies.value.length > 0 ||
    deprecatedStrategies.value.length > 0 ||
    unsupportedProOnlyNetworks.value.length > 0
);
</script>

<template>
  <template v-if="activeTab === 'voting-strategies'">
    <div v-if="isSpaceAdmin && hasAlerts" class="space-y-2" v-bind="$attrs">
      <UiAlert v-if="deprecatedStrategies.length" type="error">
        The {{ prettyConcat(deprecatedStrategies, 'and') }}
        {{ deprecatedStrategies.length > 1 ? 'strategies are' : 'strategy is' }}
        deprecated and no longer supported.
        <AppLink
          to="https://help.snapshot.box/en/articles/11638664-migrating-from-multichain-voting-strategy"
          class="inline-flex items-center"
        >
          See migration guide
          <IH-arrow-sm-right class="-rotate-45" />
        </AppLink>
      </UiAlert>
      <UiAlert v-if="unsupportedProOnlyStrategies.length" type="error">
        The
        {{ prettyConcat(unsupportedProOnlyStrategies, 'and') }}
        {{
          unsupportedProOnlyStrategies.length > 1 ? 'strategies' : 'strategy'
        }}
        require Snapshot Pro.
        <AppLink :to="{ name: 'space-pro' }">Upgrade to Pro</AppLink>
        or
        <AppLink
          to="https://help.snapshot.box/en/articles/11568442-migrating-from-delegation-to-with-delegation-strategy"
          class="inline-flex items-center"
        >
          follow migration guide
          <IH-arrow-sm-right class="-rotate-45" />
        </AppLink>
      </UiAlert>
      <UiAlert v-if="unsupportedProOnlyNetworks.length" type="error">
        The
        {{ prettyConcat(unsupportedProOnlyNetworks, 'and') }}
        {{ unsupportedProOnlyNetworks.length > 1 ? 'networks' : 'network' }}
        used by your space and/or its strategies require Snapshot Pro.
        <AppLink :to="{ name: 'space-pro' }">Upgrade to Pro</AppLink>
        or
        <AppLink
          to="https://help.snapshot.box/en/articles/10478752-what-are-the-premium-networks"
          class="inline-flex items-center"
        >
          change to a premium network
          <IH-arrow-sm-right class="-rotate-45" />
        </AppLink>
      </UiAlert>
    </div>
  </template>
</template>
