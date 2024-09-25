<script setup lang="ts">
defineProps<{
  type: 'info' | 'danger';
  learnMoreLink?: string;
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
      <a
        v-if="learnMoreLink"
        :href="learnMoreLink"
        target="_blank"
        class="flex items-center text-skin-link mt-1 gap-1 w-fit"
      >
        Learn more
        <IH-arrow-sm-right class="-rotate-45" />
      </a>
    </div>
  </div>
</template>
