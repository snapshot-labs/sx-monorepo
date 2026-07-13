<script setup lang="ts">
const props = defineProps<{
  value: string;
  masked?: boolean;
  inline?: boolean;
}>();

const { copy, copied } = useClipboard();

const displayValue = computed(() =>
  props.masked ? maskKey(props.value) : props.value
);

function maskKey(value: string): string {
  const separator = value.indexOf('_');
  const prefix =
    separator >= 0 ? value.slice(0, separator + 1) : value.slice(0, 4);
  const suffix = value.slice(-3);
  return `${prefix}${'•'.repeat(8)}${suffix}`;
}
</script>

<template>
  <div
    class="flex items-center gap-2"
    :class="
      inline
        ? 'max-w-full rounded-md bg-skin-border px-1.5 py-0.5'
        : 'rounded-lg border px-3 py-2.5'
    "
  >
    <span
      class="truncate font-mono text-sm text-skin-link"
      :class="{ grow: !inline }"
      v-text="displayValue"
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
