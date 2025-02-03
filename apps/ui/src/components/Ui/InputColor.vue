<script lang="ts">
export default {
  inheritAttrs: false
};
</script>

<script setup lang="ts">
const props = defineProps<{
  loading?: boolean;
  error?: string;
  definition: any;
}>();

const model = defineModel<string>();

const { currentMode } = useUserSkin();

const dirty = ref(false);

const inputValue = computed({
  get() {
    if (!model.value && !dirty.value && props.definition.default) {
      return props.definition.default;
    }
    return model.value;
  },
  set(newValue: string) {
    dirty.value = true;
    model.value = newValue.toUpperCase();
  }
});

const backgroundColor = computed(() => {
  const color = inputValue.value;
  return /^#[0-9A-F]{6}$/i.test(color)
    ? color
    : currentMode.value === 'dark'
      ? '#000000'
      : '#FFFFFF';
});

function generateRandomColor() {
  model.value = `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, '0')}`.toUpperCase();
}

watch(model, () => {
  dirty.value = true;
});

debouncedWatch(
  () => model.value,
  newColor => {
    model.value = validateAndConvertColor(newColor || '');
  },
  { debounce: 1000 }
);

onMounted(() => {
  if (!model.value) {
    generateRandomColor();
  }
});

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
    :dirty="dirty"
    :input-value-length="inputValue?.length"
  >
    <div class="flex">
      <div
        class="absolute size-[18px] mt-[30px] ml-3 rounded border border-skin-text border-opacity-20"
        :style="{ backgroundColor: backgroundColor }"
      />
      <input
        :id="id"
        v-model.trim="inputValue"
        type="text"
        class="s-input !pl-6"
        v-bind="$attrs"
        :placeholder="definition.examples && definition.examples[0]"
      />
      <button class="absolute right-3 mt-[20px]" @click="generateRandomColor">
        <IH-refresh class="text-skin-link" />
      </button>
    </div>
  </UiWrapperInput>
</template>
