<script setup>
defineProps({ label: String });
</script>

<template>
  <h4 class="eyebrow border-b py-2 px-4 text-skin-text" v-text="label" />
</template>
