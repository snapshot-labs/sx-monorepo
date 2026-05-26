<script setup lang="ts">
const { isWhiteLabel, resolved } = useWhiteLabel();
const route = useRoute();

const isSiteRoute = computed(() => {
  if (typeof route.name === 'string') {
    return route.name.startsWith('site-');
  }

  return false;
});

// TODO: replace with the real XMTP conversation id of the Snapshot support group.
const SUPPORT_CONV_ID = 'snapshot-support';
const helpOpen = ref(false);
const helpLoaded = ref(false);
const helpSrc = computed(
  () => `https://metro.box/#/embed/${encodeURIComponent(SUPPORT_CONV_ID)}`
);

function toggleHelp() {
  helpOpen.value = !helpOpen.value;
  if (helpOpen.value) helpLoaded.value = true;
}
</script>

<template>
  <div
    class="hidden xl:flex fixed bottom-3 pr-4 inset-x-0 max-w-maximum !mx-auto justify-end z-50 pointer-events-none"
  >
    <div class="flex flex-col items-end space-y-2 pointer-events-auto">
      <div
        v-show="helpOpen"
        class="support-panel border rounded-lg bg-skin-bg overflow-hidden shadow-xl"
      >
        <iframe
          v-if="helpLoaded"
          :src="helpSrc"
          title="Get help"
          class="size-full border-0"
          allow="clipboard-write; microphone; camera"
        />
      </div>
      <div class="flex space-x-2">
        <UiTooltip
          v-if="resolved && !isWhiteLabel && !isSiteRoute"
          title="About Snapshot"
        >
          <UiButton :to="{ name: 'site-landing' }" uniform>
            <IH-question-mark-circle class="size-[24px]" />
          </UiButton>
        </UiTooltip>
        <UiTooltip title="Get help">
          <UiButton uniform @click="toggleHelp">
            <IH-x-mark v-if="helpOpen" />
            <IH-chat v-else />
          </UiButton>
        </UiTooltip>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.support-panel {
  width: 380px;
  height: 580px;
  max-width: calc(100vw - 2rem);
  max-height: calc(100vh - 7rem);
}
</style>
