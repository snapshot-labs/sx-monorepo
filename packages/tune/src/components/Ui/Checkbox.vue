<script setup lang="ts">
import { Checkbox } from '@ui-sdk/vue/checkbox';

const enabled = defineModel<boolean>({ required: true });

defineProps<{
  title?: string;
}>();

const id = useId();
</script>

<template>
  <div class="flex items-top gap-2">
    <Checkbox
      :id="id"
      v-model:checked="enabled"
      :class="enabled ? 'bg-skin-primary' : 'border bg-skin-border'"
      class="flex items-center justify-center size-[20px] shrink-0 cursor-pointer rounded-md border-skin-border transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75"
    >
      <IC-switch-enabled v-if="enabled" class="text-skin-bg" />
    </Checkbox>
    <label :for="id" class="leading-[18px]">
      <template v-if="title">{{ title }}</template>
      <slot v-else />
    </label>
  </div>
</template>
