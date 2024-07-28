<script setup lang="ts">
import draggable from 'vuedraggable';

const uiStore = useUiStore();
const followedSpacesStore = useFollowedSpacesStore();
</script>

<template>
  <div
    class="w-[72px] flex flex-col border-r fixed left-0 top-0 bottom-0 text-center h-screen"
  >
    <router-link :to="{ name: 'landing' }" class="h-[72px] block">
      <IH-stop class="inline-block my-4 size-[32px] text-skin-link" />
    </router-link>
    <div
      class="bg-gradient-to-b from-skin-bg top-[72px] h-[8px] w-[71px] absolute z-10"
    />
    <UiLoading v-if="!followedSpacesStore.followedSpacesLoaded" />
    <draggable
      v-else
      v-model="followedSpacesStore.followedSpaces"
      :delay="100"
      :delay-on-touch-only="true"
      :touch-start-threshold="35"
      :item-key="i => i"
      v-bind="{ animation: 200 }"
      class="space-y-3 p-2 no-scrollbar overscroll-contain overflow-auto pb-3"
    >
      <template #item="{ element }">
        <router-link
          :to="{
            name: 'space-overview',
            params: { id: `${element.network}:${element.id}` }
          }"
          class="block"
          @click="uiStore.sidebarOpen = false"
        >
          <UiTooltip :title="element.name" placement="right">
            <SpaceAvatar :space="element" :size="32" class="!rounded-[4px]" />
          </UiTooltip>
        </router-link>
      </template>
    </draggable>
  </div>
</template>
