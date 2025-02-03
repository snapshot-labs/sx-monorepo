<script setup lang="ts">
import { Switch, SwitchGroup, SwitchLabel } from '@headlessui/vue';

const enabled = defineModel<boolean>({ required: true });

defineProps<{
  title: string;
  tooltip?: string;
}>();
</script>

<template>
  <SwitchGroup>
    <div class="flex items-center gap-2">
      <Switch
        v-model="enabled"
        :class="enabled ? 'bg-skin-primary' : 'bg-skin-border'"
        class="relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75"
      >
        <span
          :class="enabled ? 'translate-x-[16px]' : 'translate-x-0'"
          class="flex justify-center items-center pointer-events-none h-[18px] w-[18px] transform rounded-full bg-skin-bg shadow-lg ring-0 transition duration-200 ease-in-out"
        >
          <IC-switch-enabled v-if="enabled" class="text-skin-primary" />
          <IC-switch-disabled v-else class="text-skin-text" />
        </span>
      </Switch>
      <SwitchLabel class="text-skin-link truncate flex items-center gap-1">
        {{ title }}
        <UiTooltip v-if="tooltip" :title="tooltip">
          <IH-question-mark-circle class="shrink-0" />
        </UiTooltip>
      </SwitchLabel>
    </div>
  </SwitchGroup>
</template>
