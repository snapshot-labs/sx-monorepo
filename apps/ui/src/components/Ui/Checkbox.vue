<script setup lang="ts">
import { Switch, SwitchGroup, SwitchLabel } from '@headlessui/vue';

const enabled = defineModel<boolean>({ required: true });

defineProps<{
  title?: string;
}>();
</script>

<template>
  <SwitchGroup>
    <div class="flex items-top gap-2">
      <Switch
        v-model="enabled"
        :class="enabled ? 'bg-skin-primary' : 'border bg-skin-input-bg'"
        class="flex items-center justify-center size-[20px] shrink-0 cursor-pointer rounded-md border-skin-border transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75"
      >
        <IC-switch-enabled v-if="enabled" class="text-skin-bg" />
      </Switch>
      <SwitchLabel class="leading-[18px]">
        <template v-if="title">{{ title }}</template>
        <slot v-else />
      </SwitchLabel>
    </div>
  </SwitchGroup>
</template>
