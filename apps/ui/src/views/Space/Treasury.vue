<script setup lang="ts">
import { shorten } from '@/helpers/utils';
import { RequiredProperty, Space, SpaceMetadataTreasury } from '@/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();

const activeTreasuryId = ref(0);
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
</script>

<template>
  <UiScrollerHorizontal
    v-if="filteredTreasuries.length !== 1"
    gradient="md"
    class="z-40 sticky top-[71px] lg:top-[72px]"
  >
    <div class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max">
      <button
        v-for="(treasury, i) in filteredTreasuries"
        :key="i"
        type="button"
        @click="activeTreasuryId = i"
      >
        <UiLink
          :is-active="activeTreasuryId === i"
          :text="treasury.name || shorten(treasury.address)"
        />
      </button>
    </div>
  </UiScrollerHorizontal>
  <SpaceTreasury
    :key="activeTreasuryId"
    :space="space"
    :treasury-data="treasuryData"
    :extra-contacts="filteredTreasuries"
  />
</template>
