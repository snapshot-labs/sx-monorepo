<script setup lang="ts">
const { isWhiteLabel, resolved } = useWhiteLabel();
const route = useRoute();

const isSiteRoute = computed(() => {
  if (typeof route.name === 'string') {
    return route.name.startsWith('site-');
  }

  return false;
});

const METRO_ORIGIN = 'https://metro.box';
const { currentTheme } = useTheme();
const helpFrame = ref<HTMLIFrameElement | null>(null);
const helpOpen = ref(false);
const helpLoaded = ref(false);
const unread = ref(0);
/** Open the messenger homepage (channels list); the iframe hides the metro
 *  chrome itself when embedded. */
const helpSrc = computed(
  () => `${METRO_ORIGIN}/#/channels`
);

function toggleHelp() {
  helpOpen.value = !helpOpen.value;
  if (helpOpen.value) {
    helpLoaded.value = true;
    unread.value = 0;
  }
}

function pushTheme() {
  helpFrame.value?.contentWindow?.postMessage(
    { type: 'metro:theme', theme: currentTheme.value },
    METRO_ORIGIN
  );
}

function onMessage(e: MessageEvent) {
  if (e.origin !== METRO_ORIGIN) return;
  const type = (e.data as { type?: string })?.type;
  // Embed unread pings → badge the button while the panel is closed.
  if (type === 'metro:inbound' && !helpOpen.value) {
    unread.value += (e.data as { count?: number }).count ?? 1;
  }
  // Embed booted → send it the current theme so it matches instantly.
  if (type === 'metro:ready') pushTheme();
}
// Keep the widget's theme in sync whenever the site theme changes.
watch(currentTheme, pushTheme);
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
          ref="helpFrame"
          :src="helpSrc"
          title="Get help"
          class="size-full border-0"
          allow="clipboard-write; microphone; camera"
          @load="pushTheme"
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
