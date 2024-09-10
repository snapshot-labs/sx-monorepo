<script setup lang="ts">
import { startIntercom } from './helpers/intercom';

const route = useRoute();

const isSiteRoute = computed(() => String(route.name).startsWith('site-'));

onMounted(async () => startIntercom());
</script>

<template>
  <LayoutSite v-if="isSiteRoute" />
  <LayoutApp v-else />
</template>
