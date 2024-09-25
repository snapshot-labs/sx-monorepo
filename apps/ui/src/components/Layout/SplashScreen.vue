<script lang="ts" setup>
import defaultRoutes from '@/routes/default';
import whiteLabelRoutes from '@/routes/whiteLabel';

const { init, isWhiteLabel, resolved, failed } = useWhiteLabel();
const { setAppName } = useApp();

const router = useRouter();

function handleReloadClick() {
  window.location.reload();
}

watch([() => resolved.value, () => failed.value], ([resolved, failed]) => {
  if (!resolved || failed) return;

  const routes = isWhiteLabel.value ? whiteLabelRoutes : defaultRoutes;

  routes.forEach(route => router.addRoute(route));
  router.replace(router.currentRoute.value.fullPath);
  router.removeRoute('splash-screen');
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
