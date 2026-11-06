<script lang="ts" setup>
const { config } = useNav();
</script>

<template>
  <div class="border-r bg-skin-bg">
    <div class="py-4 no-scrollbar overscroll-contain overflow-auto">
      <div v-if="config?.header" class="px-4 pb-3">
        <UiTooltip :title="config.header.detail ?? ''" placement="right">
          <UiButton :to="config.header.link" class="whitespace-nowrap !pl-3">
            <component :is="config.header.icon" v-if="config.header.icon" />
            <span>
              {{ config.header.name }}
              <span v-if="config.header.value" class="text-skin-text">
                · {{ config.header.value }}
              </span>
            </span>
            <IS-exclamation-circle
              v-if="config.header.hasWarning"
              class="text-skin-danger size-[16px]"
            />
          </UiButton>
        </UiTooltip>
      </div>
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
  </div>
</template>
