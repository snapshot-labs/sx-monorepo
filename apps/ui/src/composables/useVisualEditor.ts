import FileHandler from '@tiptap/extension-file-handler';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { Gapcursor, Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';
import { renderToMarkdown } from '@tiptap/static-renderer/pm/markdown';
import { useEditor } from '@tiptap/vue-3';
import { Remarkable } from 'remarkable';
import {
  getUrl,
  getUserFacingErrorMessage,
  imageUpload
} from '@/helpers/utils';

const imagesUrlMapping = {};

function replaceImageUrls(
  markdown: string,
  urlTransformer: (url: string) => string
): string {
  return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    return `![${alt}](${urlTransformer(url)})`;
  });
}

async function uploadFile(file: File) {
  const image = await imageUpload(file);
  if (!image) throw new Error('Failed to upload image.');

  return image;
}

function insertEditorImages(
  uiStore: any,
  editor: any,
  files: File[],
  pos: number
) {
  files.forEach(async file => {
    try {
      const image = await uploadFile(file);
      editor
        .chain()
        .insertContentAt(pos, {
          type: 'image',
          attrs: {
            alt: image.name,
            src: getCdnUrl(image.url)
          }
        })
        .focus()
        .run();
    } catch (e) {
      uiStore.addNotification('error', getUserFacingErrorMessage(e));

      console.error('Failed to upload image', e);
    }
  });
}

function getCdnUrl(url: string) {
  const cdnUrl = getUrl(url);

  if (cdnUrl) {
    imagesUrlMapping[cdnUrl] = url;
  }

  return cdnUrl || url;
}

function getOriginalUrl(cdnUrl: string) {
  return imagesUrlMapping[cdnUrl] || cdnUrl;
}

function markdownToHtml(markdown: string) {
  const processedMarkdown = replaceImageUrls(markdown, getCdnUrl);
  return new Remarkable({ breaks: true }).render(processedMarkdown);
}

function jsonToMarkdown(extensions, json) {
  const markdown = renderToMarkdown({ extensions, content: json });
  return replaceImageUrls(markdown, getOriginalUrl);
}

export function useVisualEditor(model: Ref<string>) {
  const isEdited = ref(false);

  const extensions = [
    StarterKit,
    TableKit,
    Image,
    Gapcursor,
    FileHandler.configure({
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
      onDrop: (editor, files, pos) =>
        insertEditorImages(uiStore, editor, files, pos),
      onPaste: (editor, files) =>
        insertEditorImages(
          uiStore,
          editor,
          files,
          editor.state.selection.anchor
        )
    }),
    Placeholder.configure({
      placeholder: 'Write something ...'
    })
  ];

  const editor = useEditor({
    content: markdownToHtml(model.value || ''),
    extensions,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[260px]'
      },
      clipboardTextSerializer: slice => {
        const json = slice.content.toJSON();
        return jsonToMarkdown(extensions, { type: 'doc', content: json });
      }
    }
  });
  const uiStore = useUiStore();

  function updateModel() {
    if (!editor.value || !isEdited.value) return;

    model.value = jsonToMarkdown(extensions, editor.value.getJSON());
    isEdited.value = false;
  }

  // FIXME: this is stripping all new lines
  // FIXME: find a more efficient way to update the model
  const updateModelFn = useDebounceFn(updateModel, 1000);

  // Watch for editor initialization and set up event listener
  watch(
    editor,
    newEditor => {
      if (!newEditor) return;

      newEditor.on('update', () => {
        isEdited.value = true;
        updateModelFn();
      });
    },
    { immediate: true }
  );

  onUnmounted(() => {
    if (!editor.value) return;

    editor.value.off('update', updateModelFn);
    updateModel();
    editor.value.destroy();
  });

  return { editor };
}
