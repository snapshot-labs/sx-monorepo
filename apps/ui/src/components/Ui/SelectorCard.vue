<script lang="ts" setup>
import IHCode from '~icons/heroicons-outline/code';

withDefaults(
  defineProps<{
    item: {
      key: string;
      label: string;
      description?: string;
      tag?: string;
      icon?: Component;
    };
    selected?: boolean;
    is?: string | Component;
  }>(),
  {
    is: 'button',
    selected: false
  }
);

const emit = defineEmits<{
  (e: 'click', key: string): void;
}>();
</script>

<template>
  <component
    :is="is"
    class="flex flex-col md:flex-row !rounded-lg border w-full text-left items-stretch overflow-hidden !p-0 !gap-0"
    @click="emit('click', item.key)"
  >
    <div
      :class="[
        'flex items-center justify-center min-h-[40px] bg-skin-border text-skin-link',
        {
          'bg-skin-link !text-skin-bg': selected
        }
      ]"
    >
      <component :is="item.icon || IHCode" class="inline-block mx-3" />
    </div>
    <div class="py-3 px-4">
      <div class="flex items-center space-x-2">
        <h4 class="text-skin-link inline-block" v-text="item.label" />
        <UiPill
          v-if="item.tag"
          variant="accent"
          class="py-0.5"
          v-text="item.tag"
        />
      </div>
      <div
        v-if="item.description"
        class="text-ellipsis"
        v-text="item.description"
      />
    </div>
  </component>
</template>
