<script setup lang="ts">
import { explorePageProtocols } from '@/networks';
import { ExplorePageProtocol, ProtocolConfig } from '@/networks/types';
import { useExploreSpacesQuery } from '@/queries/spaces';

useTitle('My spaces');

const protocols = Object.values(explorePageProtocols)
  .filter(protocol => !protocol.disabled)
  .map(({ key, label }: ProtocolConfig) => ({
    key,
    label
  }));

const DEFAULT_PROTOCOL = 'snapshot';

const route = useRoute();
const router = useRouter();
const { web3 } = useWeb3();

const protocol = ref<ExplorePageProtocol>(DEFAULT_PROTOCOL);

const { data, isPending } = useExploreSpacesQuery({
  controller: toRef(() => web3.value.account),
  protocol
});

const loading = computed(
  () => (web3.value.account && isPending.value) || web3.value.authLoading
);

watch(protocol, value => {
  router.push({ query: { ...route.query, p: value } });
});

watch(
  [() => route.query.p as string],
  ([protocolQuery]) => {
    protocol.value = (
      explorePageProtocols[protocolQuery] ? protocolQuery : DEFAULT_PROTOCOL
    ) as ExplorePageProtocol;
  },
  {
    immediate: true
  }
);
</script>

<template>
  <div>
    <div class="flex justify-between p-4 gap-2 gap-y-3 flex-row">
      <div class="flex flex-row space-x-2">
        <UiSelectDropdown
          v-model="protocol"
          title="Protocol"
          gap="12"
          placement="start"
          :items="protocols"
        />
      </div>
      <UiTooltip v-if="protocol !== 'governor-bravo'" title="Create new space">
        <UiButton
          :to="{
            name: `create-space-${protocol}`
          }"
          uniform
        >
          <IH-plus-sm />
        </UiButton>
      </UiTooltip>
    </div>
    <UiSectionHeader label="My spaces" sticky />
    <UiColumnHeader class="hidden md:flex text-center">
      <div class="grow" />
      <div v-if="protocol === 'snapshot'" class="w-[100px]" v-text="'Active'" />
      <div class="w-[100px]" v-text="'Proposals'" />
      <div
        v-if="protocol === 'snapshot'"
        class="w-[100px]"
        v-text="'Followers'"
      />
    </UiColumnHeader>
    <UiLoading v-if="loading" class="block m-4" />
    <div v-else-if="data?.pages.flat().length">
      <SpacesListItem
        v-for="space in data?.pages.flat()"
        :key="space.id"
        :space="space"
      />
    </div>
    <UiStateWarning v-else class="px-4 py-3">
      There are no spaces here.
    </UiStateWarning>
  </div>
</template>
