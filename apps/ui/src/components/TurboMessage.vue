<script setup lang="ts">
import { TURBO_URL } from '@/helpers/turbo';
defineProps<{
  text: string;
}>();
</script>

<template>
  <div
    class="my-3 border bg-purple-300/20 border-purple-300 text-purple-400 rounded-lg px-3 py-2"
  >
    <IH-fire class="inline-block mr-1" /> {{ text }}
    <a
      :href="TURBO_URL"
      target="_blank"
      class="text-purple-400 underline font-semibold"
      >Turbo</a
    >.
  </div>
</template>
