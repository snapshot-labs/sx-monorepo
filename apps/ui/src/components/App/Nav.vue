<script lang="ts" setup>
import { useSpaceController } from '@/composables/useSpaceController';
import { ENSChainId, getNameOwner } from '@/helpers/ens';
import { getNavConfig } from '@/helpers/nav';
import { getNetwork, offchainNetworks } from '@/networks';
import { useSpaceQuery } from '@/queries/spaces';

const route = useRoute();
const notificationsStore = useNotificationsStore();
const { isWhiteLabel } = useWhiteLabel();

const { param } = useRouteParser('space');
const { resolved, address, networkId } = useResolve(param);
const { data: spaceData } = useSpaceQuery({
  networkId: networkId,
  spaceId: address
});
const { web3 } = useWeb3();

const currentRouteName = computed(() => String(route.matched[0]?.name));
const space = computed(() => {
  if (currentRouteName.value === 'space' && resolved.value) {
    return spaceData.value ?? null;
  }

  return null;
});

const { isController } = useSpaceController(space);

const ensOwner = computedAsync(
  async () => {
    if (
      !web3.value.account ||
      isController.value ||
      !space.value ||
      !offchainNetworks.includes(space.value.network)
    ) {
      return null;
    }

    const network = getNetwork(space.value.network);
    return getNameOwner(space.value.id, network.chainId as ENSChainId);
  },
  null,
  { lazy: true }
);

const navigationConfig = computed(() =>
  getNavConfig(currentRouteName.value, {
    route,
    space: space.value,
    networkId: networkId.value,
    address: address.value,
    isController: isController.value,
    ensOwner: ensOwner.value,
    isWhiteLabel: isWhiteLabel.value,
    web3: web3.value,
    notificationsStore
  })
);
</script>

<template>
  <div class="border-r bg-skin-bg">
    <div class="py-4 no-scrollbar overscroll-contain overflow-auto">
      <AppLink
        v-for="(item, key) in navigationConfig?.items"
        :key="key"
        :to="item.link"
        class="px-4 space-x-2 flex items-center"
        :class="[
          item.active ? 'text-skin-link' : 'text-skin-text',
          navigationConfig?.style === 'slim' ? 'py-1' : 'py-1.5'
        ]"
      >
        <component :is="item.icon" v-if="item.icon" />
        <span class="grow" v-text="item.name" />
        <UiPill v-if="item.count" :label="item.count" />
      </AppLink>
    </div>
  </div>
</template>
