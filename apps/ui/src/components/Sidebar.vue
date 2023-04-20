<script setup lang="ts">
import { useUiStore } from '@/stores/ui';
import { useSpacesStore } from '@/stores/spaces';
import draggable from 'vuedraggable';

const uiStore = useUiStore();
const spacesStore = useSpacesStore();
</script>

<template>
  <div class="w-[72px] border-r fixed left-0 top-0 bottom-0 text-center">
    <router-link :to="{ name: 'home' }" class="h-[72px] block">
      <IH-stop class="inline-block my-4 w-[32px] h-[32px] text-skin-link" />
    </router-link>
    <draggable
      v-model="spacesStore.starredSpacesIds"
      :delay="100"
      :delay-on-touch-only="true"
      :touch-start-threshold="35"
      :item-key="i => i"
      class="space-y-3 p-2"
    >
      <template #item="{ element }">
        <router-link
          :to="{ name: 'space-overview', params: { id: element } }"
          class="block"
          @click="uiStore.sidebarOpen = false"
        >
          <Stamp :id="element.split(':')[1]" :size="32" type="space" class="!rounded-[4px]" />
        </router-link>
      </template>
    </draggable>
  </div>
</template>
