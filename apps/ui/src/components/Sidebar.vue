<script setup lang="ts">
import { useSpacesStore } from '@/stores/spaces';
import { onMounted } from 'vue';

const spacesStore = useSpacesStore();

onMounted(() => spacesStore.fetch());
</script>

<template>
  <div class="w-[72px] border-r fixed left-0 top-0 bottom-0 text-center">
    <router-link :to="{ name: 'home' }" class="h-[72px] block">
      <IH-stop class="inline-block my-4 w-[32px] h-[32px] text-skin-link" />
    </router-link>
    <UiLoading v-if="!spacesStore.loaded" class="block py-2" />
    <div v-else class="space-y-3 p-2">
      <router-link
        v-for="(space, i) in spacesStore.spaces.slice(0, 5)"
        :key="i"
        :to="{ name: 'overview', params: { id: `${space.network}:${space.id}` } }"
        class="block"
      >
        <Stamp :id="space.id" :size="32" class="!rounded-[4px]" />
      </router-link>
    </div>
  </div>
</template>
