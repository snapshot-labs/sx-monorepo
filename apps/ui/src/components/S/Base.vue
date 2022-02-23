<script setup>
defineProps({ definition: Object });
</script>

<template>
  <div class="s-base">
    <label v-if="definition.title" v-text="definition.title" class="s-label" />
    <slot />
    <legend v-if="definition.description" v-text="definition.description" />
  </div>
</template>
