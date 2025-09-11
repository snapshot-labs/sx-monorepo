<script setup lang="ts">
import { DragHandle } from '@tiptap/extension-drag-handle-vue-3';
import { EditorContent } from '@tiptap/vue-3';

const model = defineModel<string>({ required: true });

const props = defineProps<{
  error?: string;
  definition: any;
}>();

const { editor } = useVisualEditor(model, props.definition);
const { isDirty } = useDirty(model, props.definition);

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
  <template v-if="editor">
    <drag-handle
      :editor="editor"
      class="handle text-skin-link opacity-70 hover:opacity-100 p-1 py-1.5 cursor-grab"
    >
      <IC-drag />
    </drag-handle>
    <UiComposerVisualToolbar :editor="editor" />
    <editor-content :editor="editor" class="mb-4" />
  </template>
</template>

<style lang="scss">
.tiptap {
  // Style placeholder text
  p.is-editor-empty:first-child::before {
    @apply opacity-60 float-left h-0 pointer-events-none;

    content: attr(data-placeholder);
  }

  img {
    // Add visual selection indicator for images
    &.ProseMirror-selectednode {
      @apply outline outline-2 outline-offset-2 outline-skin-text;
    }
  }

  // Mute paragraphs style inside table cells and list items
  li,
  td,
  th {
    > p {
      @apply m-0 p-0;
    }
  }

  & ~ div[style*='position: absolute'] {
    @apply z-20;
  }
}
</style>
