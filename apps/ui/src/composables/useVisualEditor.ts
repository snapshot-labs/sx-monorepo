import { Editor, generateHTML, generateJSON } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import FileHandler from '@tiptap/extension-file-handler';
import Image from '@tiptap/extension-image';
import {
  Table,
  TableCell,
  TableHeader,
  TableRow
} from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { Node as ProseMirrorNode, Slice } from '@tiptap/pm/model';
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

const cdnUrlsMapping = new Map<string, string>();

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
  uiStore: ReturnType<typeof useUiStore>,
  editor: Editor,
  files: File[],
  pos: number
) {
  files.forEach(async file => {
    // Create a temporary blob URL for immediate display
    const tempUrl = URL.createObjectURL(file);

    try {
      // Insert image immediately with temporary URL
      editor
        .chain()
        .insertContentAt(pos, {
          type: 'image',
          attrs: {
            alt: file.name,
            src: tempUrl
          }
        })
        .focus()
        .run();

      // Upload the file in the background
      const image = await uploadFile(file);
      const cdnUrl = getCdnUrl(image.url);

      // Preload the CDN image to prevent flashing
      const preloadImage = new window.Image();
      await new Promise((resolve, reject) => {
        preloadImage.onload = resolve;
        preloadImage.onerror = reject;
        preloadImage.src = cdnUrl;
      });

      // Find and update the image with the CDN URL
      let imageUpdated = false;
      editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
        if (
          !imageUpdated &&
          node.type.name === 'image' &&
          node.attrs.src === tempUrl
        ) {
          const tr = editor.state.tr;
          tr.setNodeMarkup(pos, undefined, {
            alt: image.name,
            src: cdnUrl
          });
          editor.view.dispatch(tr);
          imageUpdated = true;
          return false; // stop iteration
        }
        return true;
      });

      // Clean up the temporary blob URL
      URL.revokeObjectURL(tempUrl);
    } catch (e) {
      // Clean up the temporary blob URL on error
      URL.revokeObjectURL(tempUrl);

      // Remove the temporary image if it exists
      let imageRemoved = false;
      editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
        if (
          !imageRemoved &&
          node.type.name === 'image' &&
          node.attrs.src === tempUrl
        ) {
          const tr = editor.state.tr;
          tr.delete(pos, pos + node.nodeSize);
          editor.view.dispatch(tr);
          imageRemoved = true;
          return false; // stop iteration
        }
        return true;
      });

      uiStore.addNotification('error', getUserFacingErrorMessage(e));
      console.error('Failed to upload image', e);
    }
  });
}

function getCdnUrl(url: string) {
  const cdnUrl = getUrl(url);

  if (cdnUrl) {
    cdnUrlsMapping.set(cdnUrl, url);
  }

  return cdnUrl || url;
}

function getOriginalUrl(cdnUrl: string) {
  return cdnUrlsMapping.get(cdnUrl) || cdnUrl;
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

export function useVisualEditor(
  model: Ref<string>,
  definition: { examples?: string[] }
) {
  const isEdited = ref(false);

  const uiStore = useUiStore();

  const extensions = [
    StarterKit.configure({ codeBlock: false }),
    Table,
    TableRow,
    TableHeader.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          // keep style, for cell alignment
          style: {
            default: null,
            parseHTML: element => element.getAttribute('style'),
            renderHTML: attributes => {
              if (!attributes.style) return {};
              return { style: attributes.style };
            }
          }
        };
      }
    }),
    TableCell.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          // keep style, for cell alignment
          style: {
            default: null,
            parseHTML: element => element.getAttribute('style'),
            renderHTML: attributes => {
              if (!attributes.style) return {};
              return { style: attributes.style };
            }
          }
        };
      }
    }),
    Image,
    // Color syntax highlighting in code blocks
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
      placeholder: definition.examples?.[0] || 'Write something ...'
    })
  ];

  const editor = useEditor({
    content: markdownToHtml(model.value || ''),
    extensions,
    editorProps: {
      attributes: {
        class: 'markdown-body focus:outline-none pt-2'
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

        // Handle pure text paste - convert markdown to HTML and paste inline
        if (text && !hasFiles) {
          const html = markdownToHtml(text);
          const json = generateJSON(html, extensions);
          const doc = view.state.schema.nodeFromJSON(json);

          // Check if content contains block elements (headings, lists, code blocks, etc.)
          const blockTypes = [
            'heading',
            'bulletList',
            'orderedList',
            'codeBlock',
            'blockquote',
            'table'
          ];
          const hasBlockElements = doc.content.content.some(node =>
            blockTypes.includes(node.type.name)
          );

          // Create slice with appropriate openStart/openEnd based on content type
          const slice = hasBlockElements
            ? new Slice(doc.content, 0, 0) // Block paste for headings, lists, etc.
            : new Slice(doc.content, 1, 1); // Inline paste for regular text

          const tr = view.state.tr.replaceSelection(slice);
          view.dispatch(tr);

          return true;
        }

        return false;
      }
    }
  });

  function updateModel() {
    if (!editor.value || !isEdited.value) return;

    model.value = htmlToMarkdown(editor.value.getHTML());
    isEdited.value = false;
  }

  const updateModelFn = useDebounceFn(updateModel, 1000);

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

    updateModel();
    editor.value.destroy();
    cdnUrlsMapping.clear();
  });

  return { editor };
}
