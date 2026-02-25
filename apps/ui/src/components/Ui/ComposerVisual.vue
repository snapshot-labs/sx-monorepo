<script setup lang="ts">
import { EditorContent } from '@tiptap/vue-3';

const model = defineModel<string>({ required: true });

const props = defineProps<{
  error?: string;
  definition: any;
}>();

const { editor } = useVisualEditor(model, props.definition);
const { isDirty } = useDirty(model, props.definition);

const editorContainerRef = ref<HTMLElement | null>(null);

const inputValue = computed(() => {
  if (!model.value && !isDirty.value && props.definition.default) {
    return props.definition.default;
  }

  return model.value;
});

const showError = computed<boolean>(
  () =>
    !!props.error &&
    (isDirty.value || props.definition.default !== inputValue.value)
);
</script>

<template>
  <UiAlert v-if="showError" type="error" class="mb-4">
    <span v-text="error" />
    <slot name="error-suffix" />
  </UiAlert>
  <div ref="editorContainerRef" v-bind="$attrs">
    <template v-if="editor">
      <UiComposerVisualToolbar
        :clipping-container="editorContainerRef"
        :editor="editor"
      />
      <editor-content :editor="editor" class="flex" v-bind="$attrs" />
    </template>
  </div>
</template>

<style lang="scss">
.tiptap {
  @apply min-w-[100%] pb-6;

  // Style placeholder text
  p.is-editor-empty:first-child::before {
    @apply opacity-60 float-left h-0 pointer-events-none content-[attr(data-placeholder)];
  }

  img {
    // Add visual selection indicator for images
    &.ProseMirror-selectednode {
      @apply outline outline-2 outline-offset-2 outline-skin-text;
    }
  }

  // Toolbar
  & ~ div[style*='position: absolute'] {
    @apply z-20 max-w-[calc(100vw-48px)];
  }
}
</style>
