<script lang="ts" setup>
import defaultRoutes from '@/routes/default';
import whiteLabelRoutes from '@/routes/whiteLabel';

const { init, isWhiteLabel, loaded, failed } = useWhiteLabel();

const router = useRouter();

function handleReloadClick() {
  window.location.reload();
}

watch([() => loaded.value, () => failed.value], ([loaded, failed]) => {
  if (!loaded || failed) return;

  const routes = isWhiteLabel.value ? whiteLabelRoutes : defaultRoutes;

  routes.forEach(route => router.addRoute(route));
  router.replace(router.currentRoute.value.fullPath);
  router.removeRoute('splash-screen');
});

onMounted(() => init());
</script>

<template>
  <div class="flex flex-col justify-center items-center h-screen gap-5">
    <img src="@/assets/snapshot.svg" alt="Snapshot" class="w-[80px]" />
    <div v-if="failed" class="text-center space-y-3">
      <div class="text-skin-text text-[28px]">Error while loading the site</div>
      <UiButton primary @click="handleReloadClick"> Please try again </UiButton>
    </div>
    <UiLoading v-else :width="36" :height="26" class="opacity-40" />
  </div>
</template>
