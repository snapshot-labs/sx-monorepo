<script setup lang="ts">
// TODO: replace with the real XMTP conversation id of the Snapshot support group.
const SUPPORT_CONV_ID = 'snapshot-support';
const METRO_URL = 'https://metro.box';

const open = ref(false);
const loaded = ref(false);

const src = computed(
  () => `${METRO_URL}/#/embed/${encodeURIComponent(SUPPORT_CONV_ID)}`
);

function toggle() {
  open.value = !open.value;
  if (open.value) loaded.value = true;
}
</script>

<template>
  <div class="support-widget hidden sm:block">
    <div
      v-show="open"
      class="support-panel border rounded-lg bg-skin-bg overflow-hidden shadow-xl"
    >
      <iframe
        v-if="loaded"
        :src="src"
        title="Get help"
        class="size-full border-0"
        allow="clipboard-write; microphone; camera"
      />
    </div>
    <UiButton
      class="!h-[46px] !rounded-full px-4 shadow-xl"
      :primary="!open"
      @click="toggle"
    >
      <IH-x-mark v-if="open" />
      <template v-else>
        <IH-chat />
        Get help
      </template>
    </UiButton>
  </div>
</template>

<style lang="scss" scoped>
.support-widget {
  @apply fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2;
}

.support-panel {
  width: 380px;
  height: 580px;
  max-width: calc(100vw - 2rem);
  max-height: calc(100vh - 7rem);
}
</style>
