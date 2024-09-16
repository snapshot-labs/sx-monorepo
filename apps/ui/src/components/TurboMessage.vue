<script setup lang="ts">
import { TURBO_URL } from '@/helpers/turbo';

defineProps<{
  text: string;
}>();
</script>

<template>
  <div
    class="flex items-center gap-2 mb-3 border bg-purple-300/20 border-purple-300 text-purple-400 rounded-lg px-3 py-2"
  >
    <IH-fire class="shrink-0" />
    <div class="leading-6">
      {{ text }}
      <a
        :href="TURBO_URL"
        target="_blank"
        class="text-purple-400 underline font-semibold"
        >Turbo</a
      >.
    </div>
  </div>
</template>
