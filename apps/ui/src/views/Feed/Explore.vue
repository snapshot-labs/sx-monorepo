<script setup lang="ts">
const { setTitle } = useTitle();
const spacesStore = useSpacesStore();
const uiStore = useUiStore();

onMounted(() => spacesStore.fetch());

watchEffect(() => setTitle('Explore'));
</script>

<template>
  <div>
    <div
      class="ml-0 lg:ml-[240px] mr-0 xl:mr-[240px]"
      :class="{ 'translate-x-[240px] lg:translate-x-0': uiStore.sidebarOpen }"
    >
      <UiContainer class="!max-w-screen-md pt-5">
        <h2 class="mb-4 mono !text-xl" v-text="'Explore'" />
        <UiLoading v-if="!spacesStore.loaded" class="block mb-2" />
        <div v-if="spacesStore.loaded" class="max-w-screen-md">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <SpacesListItem v-for="space in spacesStore.spaces" :key="space.id" :space="space" />
          </div>
        </div>
      </UiContainer>
    </div>
    <div class="invisible xl:visible fixed w-[240px] border-l bottom-0 top-[72px] right-0" />
  </div>
</template>
