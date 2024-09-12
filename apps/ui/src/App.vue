<script setup lang="ts">
import { startIntercom } from './helpers/intercom';

const route = useRoute();

const isSiteRoute = computed(() => String(route.matched[0]?.name) === 'site');

onMounted(async () => startIntercom());
</script>

<template>
  <LayoutSite v-if="isSiteRoute" />
  <LayoutApp v-else />
</template>
