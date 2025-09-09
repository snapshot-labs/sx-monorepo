<script setup lang="ts">
import FileHandler from '@tiptap/extension-file-handler';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { Gapcursor, Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';
import { renderToMarkdown } from '@tiptap/static-renderer/pm/markdown';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { Remarkable } from 'remarkable';
import {
  getUrl,
  getUserFacingErrorMessage,
  imageUpload
} from '@/helpers/utils';

async function uploadFile(file: File) {
  try {
    const image = await imageUpload(file);
    if (!image) throw new Error('Failed to upload image.');

    return image;
  } catch (e) {
    uiStore.addNotification('error', getUserFacingErrorMessage(e));

    console.error('Failed to upload image', e);
  }
}

function insertEditorImages(currentEditor, files: File[], pos: number | null) {
  files.forEach(async file => {
    const image = await uploadFile(file);

    if (!image) return;

    currentEditor
      .chain()
      .insertContentAt(pos ?? currentEditor.state.selection.anchor, {
        type: 'image',
        attrs: {
          src: getUrl(image.url)
        }
      })
      .focus()
      .run();
  });
}

const extensions = [
  StarterKit,
  TableKit,
  Image,
  Gapcursor,
  FileHandler.configure({
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
    onDrop: insertEditorImages,
    onPaste: insertEditorImages
  }),
  Placeholder.configure({
    placeholder: 'Write something ...'
  })
];

const model = defineModel<string>({ required: true });

const props = defineProps<{
  error?: string;
  definition: any;
}>();

const uiStore = useUiStore();
const editor = useEditor({
  content: new Remarkable({ breaks: true }).render(model.value || ''),
  extensions,
  editorProps: {
    attributes: {
      class: 'focus:outline-none min-h-[260px]'
    }
  },
  onUpdate: ({ editor }) => {
    // FIXME: this is stripping all new lines
    // FIXME: this is not efficient
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
  td {
    > p:only-child {
      @apply m-0 p-0;
    }
  }

  & + div[style*='position: absolute'] {
    @apply z-20;
  }
}
</style>
