<script setup lang="ts">
import { getRandomHexColor } from '@/helpers/utils';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  loading?: boolean;
  error?: string;
  required?: boolean;
  definition: any;
}>();

const model = defineModel<string>();

const { currentTheme } = useTheme();

const uppercaseModel = computed<string | undefined>({
  get() {
    return model.value;
  },
  set(newValue) {
    model.value = newValue?.toUpperCase();
  }
});

const shadowColor = computed({
  get() {
    const value = model.value || props.definition.default;
    if (value && isColorValid(value)) {
      return value;
    }
    return currentTheme.value === 'dark' ? '#000000' : '#FFFFFF';
  },
  set(newValue: string) {
    model.value = newValue.toUpperCase();
  }
});

function isColorValid(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

function setRandomColor() {
  model.value = getRandomHexColor();
}

debouncedWatch(
  () => model.value,
  newColor => {
    model.value = validateAndConvertColor(newColor || '');
  },
  { debounce: 1000 }
);

function validateAndConvertColor(color: string): string {
  if (!color) return color;
  if (color === 'BLACK') return '#000000';

  // If color is not a hex color, convert it to hex
  if (!color.startsWith('#')) {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return color;
    ctx.fillStyle = color;
    const hexColor = ctx.fillStyle.toUpperCase();
    if (hexColor !== '#000000') {
      color = hexColor;
    }
  } else {
    // If color is a 3-digit hex color, convert it to 6-digit hex color
    if (/^#[0-9a-fA-F]{3}$/i.test(color)) {
      const [r, g, b] = [color[1], color[2], color[3]];
      color = `#${r}${r}${g}${g}${b}${b}`;
    }
  }
  return color.toUpperCase();
}
</script>

<template>
  <UiInputString
    v-model="uppercaseModel"
    :definition="definition"
    :loading="loading"
    :error="error"
    :required="required"
    v-bind="$attrs"
    class="!pl-6"
  >
    <template #prefix>
      <input
        v-model="shadowColor"
        type="color"
        class="appearance-none cursor-pointer size-[18px] rounded border border-skin-text border-opacity-20 p-0 m-0"
      />
    </template>
    <template v-if="definition.showControls" #suffix>
      <button
        title="Generate random color"
        type="button"
        @click="setRandomColor"
      >
        <IH-refresh class="text-skin-link" />
      </button>
    </template>
  </UiInputString>
</template>

<style scoped>
::-webkit-color-swatch-wrapper {
  padding: 0;
}

::-webkit-color-swatch {
  border: 0;
  border-radius: 0;
}

::-moz-color-swatch,
::-moz-focus-inner {
  border: 0;
  padding: 0;
}
</style>
