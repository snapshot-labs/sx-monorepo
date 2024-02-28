<script setup lang="ts">
import { Space, SpaceMetadataTreasury, RequiredProperty } from '@/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();

const activeTreasuryId = ref(0);
const filteredTreasuries = computed(
  () =>
    props.space.treasuries.filter(
      t => t.address && t.network
    ) as RequiredProperty<SpaceMetadataTreasury>[]
);
const treasuryData = computed(() => filteredTreasuries.value[activeTreasuryId.value]);

watchEffect(() => setTitle(`Treasury - ${props.space.name}`));
</script>

<template>
  <div
    v-if="filteredTreasuries.length !== 1"
    class="flex px-4 bg-skin-bg border-b sticky top-[71px] lg:top-[72px] z-40 space-x-3"
  >
    <a v-for="(treasury, i) in filteredTreasuries" :key="i" @click="activeTreasuryId = i">
      <UiLink :is-active="activeTreasuryId === i" :text="treasury.name || 'Unnamed treasury'" />
    </a>
  </div>
  <SpaceTreasury :key="activeTreasuryId" :space="space" :treasury-data="treasuryData" />
</template>
