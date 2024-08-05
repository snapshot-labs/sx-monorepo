<script setup lang="ts">
import { NetworkID } from '@/types';

const route = useRoute();
const spacesStore = useSpacesStore();
const proposalsStore = useProposalsStore();
const uiStore = useUiStore();

const param = ref<string>('');

watchEffect(() => {
  param.value =
    route.matched[0]?.name === 'space'
      ? String(route.params.id)
      : String(route.params.space);
});

const { resolved, address: spaceAddress, networkId } = useResolve(param);

const showSpaceLogo = computed(() =>
  ['proposal', 'space'].includes(String(route.matched[0]?.name))
);

const isInsideAppNav = computed(() =>
  ['space'].includes(String(route.matched[0]?.name))
);

const space = computed(() => {
  if (
    !showSpaceLogo.value ||
    !resolved.value ||
    !spaceAddress.value ||
    !networkId.value
  ) {
    return null;
  }
  return (
    spacesStore.spacesMap.get(`${networkId.value}:${spaceAddress.value}`) ||
    proposalsStore.getProposal(
      spaceAddress.value,
      route.params.id as string,
      networkId.value
    )?.space
  );
});
</script>

<template>
  <div
    v-if="showSpaceLogo"
    :class="{
      'mr-4 pr-2 h-full hidden lg:flex items-center border-r': isInsideAppNav,
      'w-[216px]': isInsideAppNav && !uiStore.sidebarOpen,
      '!flex w-[172px]': isInsideAppNav && uiStore.sidebarOpen
    }"
  >
    <router-link
      v-if="space"
      :to="{
        name: 'space-overview',
        params: { id: `${networkId}:${spaceAddress}` }
      }"
      class="flex space-x-2.5 truncate text-[24px]"
    >
      <SpaceAvatar
        :space="{ ...space, network: networkId as NetworkID }"
        :size="36"
        class="!rounded-[4px] shrink-0"
      />
      <span class="truncate" v-text="space.name" />
    </router-link>
  </div>
  <slot v-else />
</template>
