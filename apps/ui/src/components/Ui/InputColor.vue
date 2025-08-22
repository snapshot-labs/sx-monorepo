<script lang="ts">
export default {
  inheritAttrs: false
};
</script>

<script setup lang="ts">
import { getRandomHexColor } from '@/helpers/utils';

const props = defineProps<{
  loading?: boolean;
  error?: string;
  required?: boolean;
  definition: any;
}>();

const model = defineModel<string>();

const { currentTheme } = useTheme();

const { isDirty } = useDirty(model, props.definition);

const inputValue = computed({
  get() {
    if (!model.value && !isDirty.value && props.definition.default) {
      return props.definition.default;
    }

    return model.value;
  },
  set(newValue: string) {
    model.value = newValue.toUpperCase();
  }
});

const shadowColor = computed({
  get() {
    if (inputValue.value && isColorValid(inputValue.value)) {
      return inputValue.value;
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
  <UiWrapperInput
    v-slot="{ id }"
    :definition="definition"
    :loading="loading"
    :error="error"
    :dirty="isDirty"
    :required="required"
    :input-value-length="inputValue?.length"
  >
    <div class="flex">
      <input
        v-model="shadowColor"
        type="color"
        class="absolute appearance-none cursor-pointer size-[18px] mt-[30px] ml-3 rounded border border-skin-text border-opacity-20 padding-0 margin-0"
      />
      <input
        :id="id"
        v-model.trim="inputValue"
        type="text"
        class="s-input !pl-6"
        v-bind="$attrs"
        :placeholder="definition.examples && definition.examples[0]"
      />
      <button
        v-if="definition.showControls"
        title="Generate random color"
        class="absolute right-3 mt-[20px]"
        @click="setRandomColor"
      >
        <IH-refresh class="text-skin-link" />
      </button>
    </div>
  </UiWrapperInput>
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
