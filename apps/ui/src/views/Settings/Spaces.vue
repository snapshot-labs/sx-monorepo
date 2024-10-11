<script setup lang="ts">
import { explorePageProtocols } from '@/networks';
import { ExplorePageProtocol, ProtocolConfig } from '@/networks/types';

useTitle('My spaces');

const protocols = Object.values(explorePageProtocols).map(
  ({ key, label }: ProtocolConfig) => ({
    key,
    label
  })
);
const DEFAULT_PROTOCOL = 'snapshot';

const spacesStore = useSpacesStore();
const route = useRoute();
const router = useRouter();
const { web3 } = useWeb3();

const loaded = ref(false);

const loading = computed(
  () =>
    !loaded ||
    (web3.value.account && spacesStore.loading) ||
    web3.value.authLoading
);

watch(
  () => spacesStore.protocol,
  value => {
    router.push({ query: { ...route.query, p: value } });
  }
);

watch(
  [() => route.query.p as string, () => web3.value.account],
  ([protocolQuery, controller]) => {
    loaded.value = false;

    spacesStore.protocol = (
      explorePageProtocols[protocolQuery] ? protocolQuery : DEFAULT_PROTOCOL
    ) as ExplorePageProtocol;
    if (controller) {
      spacesStore.fetch({ controller });
    } else {
      spacesStore.explorePageSpaces = [];
    }

    loaded.value = true;
  },
  {
    immediate: true
  }
);
</script>

<template>
  <div class="flex justify-between">
    <div class="flex flex-row p-4 space-x-2">
      <UiSelectDropdown
        v-model="spacesStore.protocol"
        title="Protocol"
        gap="12"
        placement="start"
        :items="protocols"
      />
    </div>
  </div>
  <UiLabel label="My spaces" sticky />
  <UiLoading v-if="loading" class="block m-4" />
  <UiContainer
    v-else-if="spacesStore.explorePageSpaces.length"
    class="!max-w-screen-md pt-5"
  >
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
      <SpacesListItem
        v-for="space in spacesStore.explorePageSpaces"
        :key="space.id"
        :space="space"
      />
    </div>
  </UiContainer>
  <div v-else class="px-4 py-3 flex items-center space-x-2">
    <IH-exclamation-circle class="inline-block shrink-0" />
    <span v-text="'There are no spaces here.'" />
  </div>
</template>
