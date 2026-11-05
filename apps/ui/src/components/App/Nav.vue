<script lang="ts" setup>
const { config } = useNav();
</script>

<template>
  <div class="border-r bg-skin-bg flex-col">
    <div class="flex-1 py-4 no-scrollbar overscroll-contain overflow-auto">
      <AppLink
        v-for="(item, key) in config?.items ?? {}"
        v-slot="{ isExactActive }"
        :key="key"
        :to="item.link"
      >
        <div
          class="px-4 space-x-2 flex items-center"
          :class="[
            isExactActive || item.isActive
              ? 'text-skin-link'
              : 'text-skin-text',
            config?.slim ? 'py-1' : 'py-1.5'
          ]"
        >
          <component :is="item.icon" v-if="item.icon" />
          <span class="grow" v-text="item.name" />
          <UiPill v-if="item.count" :label="item.count" />
        </div>
      </AppLink>
    </div>
    <div v-if="config?.footer" class="p-4">
      <UiButton :to="config.footer.link" class="whitespace-nowrap !pl-3">
        <component :is="config.footer.icon" v-if="config.footer.icon" />
        {{ config.footer.name }}
      </UiButton>
    </div>
  </div>
</template>
