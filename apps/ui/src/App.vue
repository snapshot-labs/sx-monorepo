<script setup lang="ts">
import { startIntercom } from './helpers/intercom';

const route = useRoute();

const routeName = computed(() => String(route.matched[0]?.name));

onMounted(async () => startIntercom());
</script>

<template>
  <LayoutSite v-if="routeName === 'site'" />
  <LayoutSplashScreen v-else-if="routeName == 'splash-screen'" />
  <LayoutApp v-else />
</template>
