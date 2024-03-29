<script setup lang="ts">
import { Space, SpaceMetadataTreasury, RequiredProperty } from '@/types';
import { shorten } from '@/helpers/utils';

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
    class="overflow-y-scroll no-scrollbar z-40 sticky top-[71px] lg:top-[72px]"
  >
    <div class="flex px-4 space-x-3 bg-skin-bg border-b min-w-max">
      <a v-for="(treasury, i) in filteredTreasuries" :key="i" @click="activeTreasuryId = i">
        <UiLink
          :is-active="activeTreasuryId === i"
          :text="treasury.name || shorten(treasury.address)"
        />
      </a>
    </div>
  </div>
  <SpaceTreasury
    :key="activeTreasuryId"
    :space="space"
    :treasury-data="treasuryData"
    :extra-contacts="filteredTreasuries"
  />
</template>
