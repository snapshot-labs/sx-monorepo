<script setup lang="ts">
import { TURBO_URL, VERIFIED_URL } from '@/helpers/turbo';

defineProps<{
  text: string;
  type: 'get-turbo' | 'get-verified';
}>();
</script>

<template>
  <div
    class="flex gap-1 mb-3 border bg-purple-300/20 border-purple-300 text-purple-400 rounded-lg px-3 py-2"
  >
    <IH-fire class="shrink-0 mt-[1px]" />
    <div class="leading-6">
      <span v-if="type === 'get-turbo'">
        {{ text }} with
        <a
          :href="TURBO_URL"
          target="_blank"
          class="text-purple-400 underline font-semibold"
          >Turbo</a
        >.
      </span>
      <span v-else-if="type === 'get-verified'">
        Get your space
        <a
          :href="VERIFIED_URL"
          target="_blank"
          class="text-purple-400 underline font-semibold"
          >verified</a
        >
        to increase the limit to {{ text }}.
      </span>
      <span v-else>{{ text }}</span>
    </div>
  </div>
</template>
