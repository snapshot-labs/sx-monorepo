<script lang="ts" setup>
const { resolved: whiteLabelResolved, failed } = useWhiteLabel();
const { setAppName } = useApp();
const router = useRouter();

function handleReloadClick() {
  window.location.reload();
}

watch(
  whiteLabelResolved,
  resolved => {
    if (!resolved || failed.value) return;

    router.replace(router.currentRoute.value.fullPath);
  },
  { immediate: true }
);

onMounted(() => setAppName(null));
</script>

<template>
  <div class="flex flex-col justify-center items-center h-screen gap-5">
    <div class="mt-4 mb-8 text-center">
      <div v-if="failed" class="text-center space-y-3">
        <div class="text-skin-text">
          Oops, we couldn't load the app, please try again
        </div>
        <UiButton class="!text-skin-text" @click="handleReloadClick">
          Try again
        </UiButton>
      </div>
      <div v-else class="inline-block bg-skin-border rounded-md p-2.5">
        <UiLoading :size="30" />
      </div>
    </div>
  </div>
</template>
