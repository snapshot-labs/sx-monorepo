<script setup lang="ts">
import { RouteLocationRaw } from 'vue-router';

defineProps<{
  type: 'info' | 'danger';
  learnMoreLink?: string | RouteLocationRaw;
}>();
</script>

<template>
  <div
    class="border rounded-md p-[20px]"
    :class="{
      'text-skin-danger border-skin-danger': type === 'danger'
    }"
  >
    <IH-information-circle class="float-left mr-1" />
    <div class="leading-5">
      <slot />
      <AppLink v-if="learnMoreLink" :to="learnMoreLink">Learn more</AppLink>
    </div>
  </div>
</template>
