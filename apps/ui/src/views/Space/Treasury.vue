<script setup lang="ts">
import { shorten } from '@/helpers/utils';
import { RequiredProperty, Space, SpaceMetadataTreasury } from '@/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();
const route = useRoute();
const router = useRouter();
const treasuriesList = ref<HTMLElement | null>(null);

const activeTreasuryId = computed(() => {
  if (!route.params.index) return 0;
  return parseInt(route.params.index as string) - 1;
});

const filteredTreasuries = computed(
  () =>
    props.space.treasuries.filter(
      t => t.address && t.network
    ) as RequiredProperty<SpaceMetadataTreasury>[]
);
const treasuryData = computed(
  () => filteredTreasuries.value[activeTreasuryId.value]
);

watchEffect(() => setTitle(`Treasury - ${props.space.name}`));
// scroll to treasury tab
watch(
  activeTreasuryId,
  async () => {
    await nextTick();
    // @ts-ignore
    const el = treasuriesList.value?.$el.querySelector(`[aria-active="true"]`);
    if (el) el.scrollIntoView();
  },
  { immediate: true }
);

onMounted(() => {
  if (!route.params.index && filteredTreasuries.value.length) {
    router.replace({
      name: 'space-treasury',
      params: {
        index: 1,
        tab: 'tokens'
      }
    });
  }
});
</script>

<template>
  <UiScrollerHorizontal
    v-if="filteredTreasuries.length !== 1"
    ref="treasuriesList"
    gradient="md"
    class="z-40 sticky top-[71px] lg:top-[72px]"
  >
    <div class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max">
      <router-link
        v-for="(treasury, i) in filteredTreasuries"
        :key="i"
        type="button"
        :to="{
          name: 'space-treasury',
          params: {
            index: i + 1,
            tab: 'tokens'
          }
        }"
        :aria-active="activeTreasuryId === i"
      >
        <UiLink
          :is-active="activeTreasuryId === i"
          :text="treasury.name || shorten(treasury.address)"
        />
      </router-link>
    </div>
  </UiScrollerHorizontal>
  <SpaceTreasury
    v-if="treasuryData"
    :key="activeTreasuryId"
    :space="space"
    :treasury-data="treasuryData"
    :extra-contacts="filteredTreasuries"
  />
  <div v-else class="flex items-center px-4 py-3 text-skin-link gap-2">
    <IH-exclamation-circle />
    <span v-text="'Treasury not found.'" />
  </div>
</template>
