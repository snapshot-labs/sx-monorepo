<script setup lang="ts">
const { app } = useApp();

watchEffect(() => {
  document.title = app.value.app_name;
});
</script>

<template>
  <div class="max-w-maximum mx-auto">
    <LayoutApp />
  </div>
</template>
