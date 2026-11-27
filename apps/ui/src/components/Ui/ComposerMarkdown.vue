<script setup lang="ts">
import { useFieldText } from '@snapshot-labs/tune';
import { Textarea } from '@ui-sdk/vue/textarea';
import { _n } from '@/helpers/utils';

const model = defineModel<string>({ required: true });

const props = defineProps<{
  error?: string;
  definition: any;
}>();

const editorContainerRef = ref<HTMLDivElement | null>(null);
const editorFileInputRef = ref<HTMLInputElement | null>(null);
const editorRef = ref<HTMLTextAreaElement | null>(null);
const setEditor = (textarea: unknown) =>
  (editorRef.value = (textarea as { $el?: HTMLTextAreaElement })?.$el ?? null);
const editor = useMarkdownEditor(
  editorRef,
  editorFileInputRef,
  editorContainerRef,
  value => (model.value = value)
);
const { isDirty } = useDirty(model, props.definition);

// Like v-model.trim: the model is trimmed as you type, the field on blur
const text = useFieldText(model, value => value.trim());

function update(value: string) {
  text.value = value;
  model.value = value.trim();
}

const inputValueLength = computed(() => model.value.length);

const showError = computed<boolean>(
  () =>
    !!props.error && (isDirty.value || props.definition.default !== model.value)
);
</script>

<template>
  <div
    ref="editorContainerRef"
    class="s-base flex"
    :class="{
      's-error': showError
    }"
  >
    <div class="s-label s-toolbar">
      <label class="text-sm hidden s-label-char-count whitespace-nowrap">
        <template v-if="inputValueLength >= 0 && definition.maxLength">
          {{ _n(inputValueLength) }} / {{ _n(definition.maxLength) }}
        </template>
      </label>
      <div class="grow"></div>
      <UiTooltip title="Add heading text">
        <UiButton
          plain
          class="p-1 size-[26px] leading-[18px] hover:text-skin-link rounded focus-visible:ring-1"
          aria-label="Add heading text"
          @click="editor.heading"
        >
          H
        </UiButton>
      </UiTooltip>
      <UiTooltip title="Add bold text">
        <UiButton
          plain
          class="p-1 size-[26px] leading-[18px] font-bold hover:text-skin-link rounded focus-visible:ring-1"
          aria-label="Add bold text"
          @click="editor.bold"
        >
          B
        </UiButton>
      </UiTooltip>
      <UiTooltip title="Add italic text">
        <UiButton
          plain
          class="p-1 size-[26px] leading-[18px] italic hover:text-skin-link rounded focus-visible:ring-1"
          aria-label="Add italic text"
          @click="editor.italic"
        >
          <span class="font-display !text-[17px] !font-normal">I</span>
        </UiButton>
      </UiTooltip>
      <UiTooltip title="Add a link" class="size-[26px]">
        <UiButton
          plain
          class="p-1 size-[26px] leading-[18px] italic hover:text-skin-link rounded focus-visible:ring-1"
          aria-label="Add a link"
          @click="editor.link"
        >
          <IS-link class="size-[18px]" />
        </UiButton>
      </UiTooltip>
      <UiTooltip title="Add an image" class="size-[26px]">
        <label
          class="flex justify-center p-1 size-[26px] leading-[18px] italic hover:text-skin-link rounded focus-visible:ring-1"
        >
          <input
            ref="editorFileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            :disabled="editor.uploading.value"
          />
          <UiLoading
            v-if="editor.uploading.value"
            :size="14"
            class="inline-block"
          />
          <IS-photo v-else class="size-[18px]" />
        </label>
      </UiTooltip>
    </div>
    <Textarea
      :ref="setEditor"
      :value="text"
      :aria-label="definition?.title"
      :placeholder="definition?.examples ? definition.examples[0] : ''"
      class="s-input"
      @value-change="update"
      @change="text = text.trim()"
    />
    <div v-if="showError" class="s-input-error-message leading-6 mt-2">
      <span v-text="error" />
      <slot name="error-suffix" />
    </div>
  </div>
</template>

<style scoped lang="scss">
$toolBarHeight: 43px;

.s-base {
  .s-input {
    @apply border-t-[#{$toolBarHeight}] pt-2 min-h-[85px] mb-0;
  }

  .s-toolbar {
    @apply py-2 px-3 items-center space-x-1 flex bg-skin-bg h-[#{$toolBarHeight}] rounded-t-lg top-[1px] right-[1px] left-[1px] m-0;

    &.s-label::before {
      @apply top-[#{$toolBarHeight}];
    }
  }

  &.s-error .s-toolbar :not(.s-label-char-count) {
    @apply text-skin-text;
  }
}
</style>
