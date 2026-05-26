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
const METRO_ORIGIN = 'https://metro.box';
const helpOpen = ref(false);
const helpLoaded = ref(false);
const unread = ref(0);
const helpSrc = computed(
  () => `${METRO_ORIGIN}/#/embed/${encodeURIComponent(SUPPORT_CONV_ID)}`
);

function toggleHelp() {
  helpOpen.value = !helpOpen.value;
  if (helpOpen.value) {
    helpLoaded.value = true;
    unread.value = 0;
  }
}

/** The embedded metro.box messenger posts an unread ping per inbound
 *  message; count them while the panel is closed to badge the button. */
function onMessage(e: MessageEvent) {
  if (e.origin !== METRO_ORIGIN) return;
  if ((e.data as { type?: string })?.type !== 'metro:inbound') return;
  if (!helpOpen.value) unread.value += (e.data as { count?: number }).count ?? 1;
}
onMounted(() => window.addEventListener('message', onMessage));
onUnmounted(() => window.removeEventListener('message', onMessage));
</script>

<template>
  <div
    class="hidden xl:flex fixed bottom-3 pr-4 inset-x-0 max-w-maximum !mx-auto justify-end z-50 pointer-events-none"
  >
    <div class="flex flex-col items-end space-y-2 pointer-events-auto">
      <div
        v-show="helpOpen"
        class="support-panel border rounded-lg bg-skin-bg overflow-hidden shadow-sm"
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
          <UiButton uniform class="relative" @click="toggleHelp">
            <IH-x-mark v-if="helpOpen" />
            <IH-chat v-else />
            <span
              v-if="!helpOpen && unread > 0"
              class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-skin-danger text-white text-[11px] leading-[18px] text-center"
            >{{ unread > 99 ? '99+' : unread }}</span>
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
