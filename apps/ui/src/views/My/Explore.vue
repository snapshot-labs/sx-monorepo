<script setup lang="ts">
import snapshotNetworks from '@snapshot-labs/snapshot.js/src/networks.json';
import { SPACE_CATEGORIES } from '@/helpers/constants';
import { getUrl } from '@/helpers/utils';
import { explorePageProtocols, getNetwork } from '@/networks';
import { ExplorePageProtocol, ProtocolConfig } from '@/networks/types';
import { SelectItem } from '@/types';

type SpaceCategory = 'all' | (typeof SPACE_CATEGORIES)[number]['id'];

const DEFAULT_PROTOCOL = 'snapshot';
const DEFAULT_NETWORK = 'all';
const DEFAULT_CATEGORY = 'all';

const protocols = Object.values(explorePageProtocols).map(
  ({ key, label }: ProtocolConfig) => ({
    key,
    label
  })
);

const categories = [
  { key: 'all', label: 'All categories' },
  ...SPACE_CATEGORIES.map(category => ({
    key: category.id,
    label: category.name
  }))
];

const { setTitle } = useTitle();
const spacesStore = useSpacesStore();
const route = useRoute();
const router = useRouter();

const protocol = ref<ExplorePageProtocol>(DEFAULT_PROTOCOL);
const network = ref<string>(DEFAULT_NETWORK);
const category = ref<SpaceCategory>(DEFAULT_CATEGORY);

const networks = computed(() => {
  const explorePageNetworks = explorePageProtocols[protocol.value].networks;

  let protocolNetworks: SelectItem<string>[] = [];
  if (protocol.value === 'snapshot') {
    const shouldShowTestnetNetworks = explorePageNetworks.includes('s-tn');

    protocolNetworks = Object.entries(snapshotNetworks)
      .filter(([, network]) => {
        if (
          shouldShowTestnetNetworks &&
          'testnet' in network &&
          network.testnet
        ) {
          return false;
        }

        return true;
      })
      .map(([id, network]) => ({
        id,
        name: network.name,
        icon: h('img', {
          src: getUrl(network.logo),
          alt: network.name,
          class: 'rounded-full size-3.5'
        })
      }));
  } else {
    protocolNetworks = explorePageNetworks.map(networkId => {
      const network = getNetwork(networkId);

      return {
        id: networkId,
        name: network.name,
        icon: h('img', {
          src: getUrl(network.avatar),
          alt: network.name,
          class: 'rounded-full size-3.5'
        })
      };
    });
  }

  return [{ id: 'all', name: 'All networks' }, ...protocolNetworks];
});

function isValidNetwork(network: string): network is string {
  return network === 'all' || networks.value.some(n => n.id === network);
}

function isValidCategory(category: string): category is SpaceCategory {
  return category === 'all' || SPACE_CATEGORIES.some(c => c.id === category);
}

watch([protocol, category, network], ([p, c, n]) => {
  const props: { p?: string; c?: string; n?: string } = {
    ...route.query,
    p,
    c,
    n
  };
  if (p !== 'snapshot') delete props.c;

  router.push({ query: props });
});

watch(
  [
    () => route.query.q as string,
    () => route.query.p as string,
    () => route.query.c as string,
    () => route.query.n as string
  ],
  ([searchQuery, protocolQuery, categoryQuery, networkQuery]) => {
    const _protocol = (
      explorePageProtocols[protocolQuery] ? protocolQuery : DEFAULT_PROTOCOL
    ) as ExplorePageProtocol;

    protocol.value = _protocol;
    network.value = isValidNetwork(networkQuery)
      ? networkQuery
      : DEFAULT_NETWORK;
    category.value = isValidCategory(categoryQuery)
      ? categoryQuery
      : DEFAULT_CATEGORY;
    spacesStore.protocol = _protocol;
    spacesStore.fetch({
      searchQuery,
      category: category.value,
      network: network.value
    });
  },
  {
    immediate: true
  }
);

watchEffect(() => setTitle('Explore'));
</script>

<template>
  <div class="flex justify-between">
    <div class="flex flex-row flex-wrap p-4 gap-2">
      <UiSelectDropdown
        v-model="protocol"
        class="min-h-[46px]"
        title="Protocol"
        gap="12"
        placement="start"
        :items="protocols"
      />
      <Combobox
        v-model="network"
        class="mb-0"
        inline
        :definition="{
          type: 'string',
          title: 'Network',
          enum: networks.map(c => c.id),
          options: networks,
          examples: ['Select network']
        }"
      />
      <UiSelectDropdown
        v-if="protocol === 'snapshot'"
        v-model="category"
        class="min-h-[46px]"
        title="Category"
        gap="12"
        placement="start"
        :items="categories"
      />
    </div>
  </div>
  <div>
    <UiLabel label="Spaces" sticky />
    <UiLoading v-if="spacesStore.loading" class="block m-4" />
    <div v-else-if="spacesStore.loaded">
      <UiContainerInfiniteScroll
        v-if="spacesStore.explorePageSpaces.length"
        :loading-more="spacesStore.loadingMore"
        class="justify-center max-w-screen-md 2xl:max-w-screen-xl 3xl:max-w-screen-2xl mx-auto p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-explore-3 2xl:grid-cols-explore-4 3xl:grid-cols-explore-5 gap-3"
        @end-reached="
          spacesStore.fetchMore({ searchQuery: route.query.q as string })
        "
      >
        <SpacesListItem
          v-for="space in spacesStore.explorePageSpaces"
          :key="space.id"
          :space="space"
        />
      </UiContainerInfiniteScroll>
      <div v-else class="px-4 py-3 flex items-center space-x-2">
        <IH-exclamation-circle class="inline-block shrink-0" />
        <span>No results found for your search</span>
      </div>
    </div>
  </div>
</template>
