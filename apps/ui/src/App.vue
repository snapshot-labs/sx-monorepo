<script setup lang="ts">
import { RouteRecordRaw } from 'vue-router';
import ElectronTitlebar from '@/components/ElectronTitlebar.vue';
import defaultRoutes from '@/routes/default';
import { orgWhiteLabelRoutes } from '@/routes/organization';
import whiteLabelRoutes from '@/routes/whiteLabel';

const route = useRoute();
const router = useRouter();
const { app, isAuctionApp } = useApp();
const {
  init: initWhiteLabel,
  isWhiteLabel,
  isOrganization,
  isCustomDomain,
  resolved: whiteLabelResolved,
  failed: whiteLabelFailed
} = useWhiteLabel();
const { setTitle } = useTitle();

const routeName = computed(() => String(route.matched[0]?.name));

function getCustomDomainRoutes(): RouteRecordRaw[] {
  if (isOrganization.value) return orgWhiteLabelRoutes;
  if (isWhiteLabel.value) return whiteLabelRoutes;
  return defaultRoutes;
}

function mountCustomDomainRoutes() {
  getCustomDomainRoutes().forEach(route => router.addRoute(route));
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
