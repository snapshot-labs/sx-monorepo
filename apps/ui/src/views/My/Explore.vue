import ProposalIconStatus from '@/components/ProposalIconStatus.vue';

<script setup lang="ts">
const { setTitle } = useTitle();
const spacesStore = useSpacesStore();
watchEffect(() => setTitle('Explore'));

const filter = ref('snapshot' as 'snapshot' | 'snapshotx');
onMounted(() => spacesStore.fetch({ networkType: filter.value }));

watch(filter, toFilter => {
  spacesStore.fetch({ networkType: toFilter });
});
</script>

<template>
  <div class="flex justify-between">
    <div class="flex flex-row p-4 space-x-2">
      <UiSelectDropdown
        v-model="filter"
        title="Protocol"
        gap="12px"
        placement="left"
        :items="[
          {
            key: 'snapshot',
            label: 'Snapshot'
          },
          {
            key: 'snapshotx',
            label: 'Snapshot X'
          }
        ]"
      />
    </div>
  </div>
  <div>
    <UiLabel label="Spaces" sticky />
    <UiLoading v-if="spacesStore.loading" class="block m-4" />
    <div v-else-if="spacesStore.loaded" class="max-w-screen-md mx-auto p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        <SpacesListItem v-for="space in spacesStore.spaces" :key="space.id" :space="space" />
      </div>
    </div>
  </div>
</template>
