<script lang="ts" setup>
const { init, mountRoutes, resolved, failed } = useWhiteLabel();
const { setAppName } = useApp();

function handleReloadClick() {
  window.location.reload();
}

watch([() => resolved.value, () => failed.value], ([resolved, failed]) => {
  if (!resolved || failed) return;

  mountRoutes();
});

onMounted(() => {
  init();
  setAppName(null);
});
</script>

<template>
  <div class="flex flex-col justify-center items-center h-screen gap-5">
    <IC-zap
      class="size-[120px] fill-skin-border"
      :class="{ 'animate-pulse': !failed }"
    />
    <div v-if="failed" class="text-center space-y-3">
      <div class="text-skin-text">Error while loading the site</div>
      <UiButton class="!text-skin-text" @click="handleReloadClick">
        Please try again
      </UiButton>
    </div>
  </div>
</template>
