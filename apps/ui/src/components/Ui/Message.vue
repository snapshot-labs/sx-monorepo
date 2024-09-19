<script setup lang="ts">
defineProps<{
  type: 'info' | 'danger';
  learnMoreLink?: string;
}>();
</script>

<template>
  <div
    class="border rounded-md p-[20px] flex gap-1"
    :class="{
      'text-skin-danger border-skin-danger': type === 'danger'
    }"
  >
    <IH-information-circle class="shrink-0" />
    <div class="leading-5">
      <slot />
      <a
        v-if="learnMoreLink"
        :href="learnMoreLink"
        target="_blank"
        class="flex items-center text-skin-link mt-1 gap-1 w-fit"
      >
        Learn more
        <IH-arrow-top-right-on-square />
      </a>
    </div>
  </div>
</template>
