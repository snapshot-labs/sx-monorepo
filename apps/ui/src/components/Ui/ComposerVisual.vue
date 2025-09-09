<script setup lang="ts">
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';
import { renderToMarkdown } from '@tiptap/static-renderer/pm/markdown';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { Remarkable } from 'remarkable';

const extensions = [
  StarterKit,
  TableKit,
  Placeholder.configure({
    placeholder: 'Write something ...',
    showOnlyWhenEditable: true
  })
];

const model = defineModel<string>({ required: true });

const props = defineProps<{
  error?: string;
  definition: any;
}>();

const editor = useEditor({
  content: new Remarkable().render(model.value || ''),
  extensions,
  editorProps: {
    attributes: {
      class: 'focus:outline-none min-h-[260px]'
    }
  },
  onUpdate: ({ editor }) => {
    model.value = renderToMarkdown({ extensions, content: editor.getJSON() });
  }
});
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
    <UiComposerVisualToolbar :editor="editor" />
    <editor-content :editor="editor" class="markdown-body mb-[14px]" />
  </template>
</template>

<style lang="scss">
p.is-editor-empty:first-child::before {
  @apply opacity-60 float-left h-0 pointer-events-none;

  content: attr(data-placeholder);
}
</style>
