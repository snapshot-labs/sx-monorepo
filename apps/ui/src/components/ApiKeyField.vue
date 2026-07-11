<script setup lang="ts">
const props = defineProps<{
  value: string;
  maskable?: boolean;
}>();

const { copy, copied } = useClipboard();

const revealed = ref(!props.maskable);

const displayValue = computed(() =>
  revealed.value ? props.value : maskKey(props.value)
);

function maskKey(value: string): string {
  const separator = value.indexOf('_');
  const prefix =
    separator >= 0 ? value.slice(0, separator + 1) : value.slice(0, 4);
  return `${prefix}${'•'.repeat(20)}`;
}
</script>

<template>
  <div class="flex items-center gap-2 rounded-lg border px-3 py-2.5">
    <span
      class="grow truncate font-mono text-sm text-skin-link"
      v-text="displayValue"
    />
    <UiTooltip v-if="maskable" :title="revealed ? 'Hide key' : 'Reveal key'">
      <button
        type="button"
        class="text-skin-text shrink-0 flex"
        :aria-label="revealed ? 'Hide API key' : 'Reveal API key'"
        @click="revealed = !revealed"
      >
        <IH-eye-off v-if="revealed" class="size-[18px]" />
        <IH-eye v-else class="size-[18px]" />
      </button>
    </UiTooltip>
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
