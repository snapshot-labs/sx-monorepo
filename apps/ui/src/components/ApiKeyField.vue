<script setup lang="ts">
const props = defineProps<{
  value: string;
}>();

const { copy, copied } = useClipboard();
</script>

<template>
  <div class="flex items-center gap-2 rounded-lg border px-3 py-2.5">
    <span
      class="grow truncate font-mono text-sm text-skin-link"
      v-text="value"
    />
    <UiTooltip :title="copied ? 'Copied' : 'Copy key'">
      <button
        type="button"
        class="text-skin-text shrink-0 flex"
        aria-label="Copy API key"
        @click="copy(props.value)"
      >
        <IH-duplicate v-if="!copied" class="size-[18px]" />
        <IH-check v-else class="size-[18px] text-skin-success" />
      </button>
    </UiTooltip>
  </div>
</template>
