<script setup lang="ts">
import defaultRoutes from '@/routes/default';
import whiteLabelRoutes from '@/routes/whiteLabel';

const route = useRoute();
const router = useRouter();
const { app } = useApp();
const {
  init: initWhiteLabel,
  isWhiteLabel,
  isCustomDomain,
  resolved: whiteLabelResolved,
  failed: whiteLabelFailed
} = useWhiteLabel();
const { setTitle } = useTitle();

const routeName = computed(() => String(route.matched[0]?.name));

function mountCustomDomainRoutes() {
  const routes = isWhiteLabel.value ? whiteLabelRoutes : defaultRoutes;

  routes.forEach(route => router.addRoute(route));
  router.removeRoute('splash');
}

watchEffect(() => setTitle(app.value.app_name));

watch(
  whiteLabelResolved,
  resolved => {
    if (!resolved) return;

    if (isCustomDomain.value && !whiteLabelFailed.value) {
      mountCustomDomainRoutes();
    }
  },
  { immediate: true }
);

onMounted(() => initWhiteLabel());
</script>

<template>
  <div class="max-w-maximum mx-auto">
    <LayoutSplash v-if="!whiteLabelResolved" />
    <LayoutSite v-else-if="routeName === 'site'" />
    <LayoutApp v-else />
    <AppFooter />
  </div>
</template>
