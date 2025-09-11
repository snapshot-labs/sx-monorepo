import { generateHTML, generateJSON } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import FileHandler from '@tiptap/extension-file-handler';
import Image from '@tiptap/extension-image';
import NodeRange from '@tiptap/extension-node-range';
import { TableKit } from '@tiptap/extension-table';
import { Gapcursor, Placeholder } from '@tiptap/extensions';
import { Slice } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import { useEditor } from '@tiptap/vue-3';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import { solidity } from 'highlightjs-solidity';
import { createLowlight } from 'lowlight';
import { Remarkable } from 'remarkable';
import turndownService from '@/helpers/turndownService';
import {
  getUrl,
  getUserFacingErrorMessage,
  imageUpload
} from '@/helpers/utils';

const cdnUrlsMapping = {};

const lowlight = createLowlight();
lowlight.register('javascript', javascript);
lowlight.register('json', json);
lowlight.register('rust', rust);
lowlight.register('python', python);
lowlight.register('solidity', solidity);

function replaceCdnUrls(
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
    cdnUrlsMapping[cdnUrl] = url;
  }

  return cdnUrl || url;
}

function getOriginalUrl(cdnUrl: string) {
  return cdnUrlsMapping[cdnUrl] || cdnUrl;
}

function markdownToHtml(markdown: string) {
  const processedMarkdown = replaceCdnUrls(markdown, getCdnUrl);
  const html = new Remarkable({ breaks: true }).render(processedMarkdown);

  // Remove trailing newlines inside <pre><code> blocks
  const cleanedHtml = html.replace(
    /(<pre><code[^>]*>[\s\S]*?)\n+(<\/code><\/pre>)/g,
    '$1$2'
  );

  return cleanedHtml;
}

function htmlToMarkdown(html: string) {
  const converter = turndownService();
  const markdown = converter(html);

  return replaceCdnUrls(markdown, getOriginalUrl);
}

export function useVisualEditor(model: Ref<string>) {
  const isEdited = ref(false);

  const extensions = [
    StarterKit,
    TableKit,
    Image,
    Gapcursor,
    NodeRange.configure({
      // allow to select only on depth 0
      // depth: 0,
      key: null
    }),
    CodeBlockLowlight.configure({
      // prevent code blocks without language from showing as: ```null
      defaultLanguage: '',
      lowlight
    }),
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
        class: 'markdown-body focus:outline-none min-h-[250px]'
      },
      clipboardTextSerializer: slice => {
        const json = slice.content.toJSON();
        const html = generateHTML({ type: 'doc', content: json }, extensions);
        return htmlToMarkdown(html);
      },
      handlePaste: (view, event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const text = clipboardData.getData('text/plain');
        const hasFiles = clipboardData.files && clipboardData.files.length > 0;

        // If there are files, let FileHandler handle the entire paste
        // This is because mixed content (files + text) is typically from rich editors
        // where the text is just a fallback representation
        if (hasFiles) return false;

        // Handle pure text paste - convert markdown to HTML
        if (text && !hasFiles) {
          const html = markdownToHtml(text);
          const json = generateJSON(html, extensions);
          const doc = view.state.schema.nodeFromJSON(json);
          const slice = new Slice(doc.content, 0, 0);

          const tr = view.state.tr.replaceSelection(slice);
          view.dispatch(tr);

          return true;
        }

        return false;
      }
    }
  });
  const uiStore = useUiStore();

  function updateModel() {
    if (!editor.value || !isEdited.value) return;

    model.value = htmlToMarkdown(editor.value.getHTML());
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
