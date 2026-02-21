<script setup lang="ts">
import ElectronTitlebar from '@/components/ElectronTitlebar.vue';
import defaultRoutes from '@/routes/default';
import { orgRootRoutes } from '@/routes/organization';
import whiteLabelRoutes from '@/routes/whiteLabel';

const route = useRoute();
const router = useRouter();
const { app, isAuctionApp } = useApp();
const {
  init: initWhiteLabel,
  isWhiteLabel,
  isCustomDomain,
  space: whiteLabelSpace,
  resolved: whiteLabelResolved,
  failed: whiteLabelFailed
} = useWhiteLabel();
const { setTitle } = useTitle();

const routeName = computed(() => String(route.matched[0]?.name));

function getCustomDomainRoutes() {
  if (!isWhiteLabel.value) return defaultRoutes;
  if (!whiteLabelSpace.value) return orgRootRoutes;
  return whiteLabelRoutes;
}

function mountCustomDomainRoutes() {
  getCustomDomainRoutes().forEach(r => router.addRoute(r));
  router.removeRoute('splash');
}

watchEffect(() => setTitle(app.value.app_name));

watch(
  whiteLabelResolved,
  resolved => {
    if (!resolved || isAuctionApp.value) return;

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
    <ElectronTitlebar />
    <LayoutSplash v-if="!whiteLabelResolved && !isAuctionApp" />
    <LayoutSite v-else-if="routeName === 'site'" />
    <LayoutApp v-else />
    <AppFooter v-if="!isAuctionApp" />
  </div>
</template>
