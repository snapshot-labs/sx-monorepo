<script setup lang="ts">
import { startIntercom } from './helpers/intercom';

const route = useRoute();
const { app } = useApp();
const { isWhiteLabel, loaded: whiteLabelLoaded } = useWhiteLabel();
const { setTitle } = useTitle();

const routeName = computed(() => String(route.matched[0]?.name));

watchEffect(() => setTitle(app.value.app_name));

watch(
  [() => isWhiteLabel.value, () => whiteLabelLoaded.value],
  ([isWhiteLabel, whiteLabelLoaded]) => {
    if (isWhiteLabel || !whiteLabelLoaded) return;

    startIntercom();
  },
  { immediate: true }
);
</script>

<template>
  <LayoutSite v-if="routeName === 'site'" />
  <LayoutSplashScreen v-else-if="routeName == 'splash-screen'" />
  <LayoutApp v-else />
</template>
