<script lang="ts" setup>
const { config } = useNav();
</script>

<template>
  <div class="border-r bg-skin-bg">
    <div class="py-4 no-scrollbar overscroll-contain overflow-auto">
      <AppLink
        v-for="(item, key) in config?.items ?? {}"
        :key="key"
        :to="item.link"
        :is-external="item.isExternal"
        class="px-4 space-x-2 flex items-center"
        :class="[
          item.active ? 'text-skin-link' : 'text-skin-text',
          config?.style === 'slim' ? 'py-1' : 'py-1.5'
        ]"
      >
        <component :is="item.icon" v-if="item.icon" />
        <span class="grow" v-text="item.name" />
        <UiPill v-if="item.count" :label="item.count" />
      </AppLink>
    </div>
  </div>
</template>
