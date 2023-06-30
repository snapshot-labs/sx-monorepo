import { useUiStore } from '@/stores/ui';
import { imageUpload } from '@/helpers/utils';

type Formatting = {
  prefix: string;
  suffix: string;
};

type ChangeHandler = (value: string) => void;

export function useMarkdownEditor(
  editorRef: Ref<HTMLTextAreaElement | null>,
  editorFileInputRef: Ref<HTMLInputElement | null>,
  editorContainerRef: Ref<HTMLDivElement | null>,
  handler: ChangeHandler
) {
  const shortcuts = {
    b: bold,
    i: italic,
    k: link
  };

  const uiStore = useUiStore();

  const hovered = ref(false);
  const uploading = ref(false);

  watch(editorRef, el => {
    if (!el) return;

    el.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && shortcuts[e.key]) {
        e.preventDefault();
        shortcuts[e.key]();
      }
    });
  });

  watch(editorFileInputRef, el => {
    if (!el) return;

    el.addEventListener('change', () => {
      if (!el.files) return;

      uploadFile(el.files[0]);

      el.value = '';
    });
  });

  watch(editorContainerRef, el => {
    if (!el) return;

    let counter = 0;

    el.addEventListener('dragenter', () => {
      counter++;
      hovered.value = true;
    });

    el.addEventListener('dragover', e => {
      e.preventDefault();
    });

    el.addEventListener('dragleave', () => {
      counter--;

      if (counter === 0) hovered.value = false;
    });

    el.addEventListener('drop', e => {
      console.log('drop');
      e.preventDefault();
      e.stopPropagation();
      hovered.value = false;

      if (!e.dataTransfer) return;

      const { files } = e.dataTransfer;
      if (!files.length) return;

      uploadFile(files[0]);
    });
  });

  function scheduleSelection(start: number, end: number) {
    requestAnimationFrame(() => {
      if (editorRef.value) editorRef.value.setSelectionRange(start, end);
    });
  }

  function getEditorChange(formatting: Formatting) {
    if (!editorRef.value) return;

    const { selectionStart, selectionEnd, value } = editorRef.value;

    const hasNoSelection = selectionStart === selectionEnd;
    const selectionFormattedOutside =
      value.substring(selectionStart - formatting.prefix.length, selectionStart) ===
        formatting.prefix &&
      value.substring(selectionEnd, selectionEnd + formatting.suffix.length) === formatting.suffix;
    const selectionFormattedInside =
      value.substring(selectionStart, selectionStart + formatting.prefix.length) ===
        formatting.prefix &&
      value.substring(selectionEnd - formatting.suffix.length, selectionEnd) === formatting.suffix;

    if (hasNoSelection) {
      const formattedValue =
        value.substring(0, selectionStart) +
        formatting.prefix +
        formatting.suffix +
        value.substring(selectionEnd);

      return {
        value: formattedValue,
        selectionStart: selectionStart + formatting.prefix.length,
        selectionEnd: selectionStart + formatting.prefix.length
      };
    }

    if (selectionFormattedOutside) {
      const formattedValue =
        value.substring(0, selectionStart - formatting.prefix.length) +
        value.substring(selectionStart, selectionEnd) +
        value.substring(selectionEnd + formatting.suffix.length);

      return {
        value: formattedValue,
        selectionStart: selectionStart - formatting.prefix.length,
        selectionEnd: selectionEnd - formatting.prefix.length
      };
    }

    if (selectionFormattedInside) {
      const formattedValue =
        value.substring(0, selectionStart) +
        value.substring(
          selectionStart + formatting.prefix.length,
          selectionEnd - formatting.suffix.length
        ) +
        value.substring(selectionEnd);

      return {
        value: formattedValue,
        selectionStart: selectionStart,
        selectionEnd: selectionEnd - formatting.prefix.length - formatting.suffix.length
      };
    }

    const formattedValue =
      value.substring(0, selectionStart) +
      formatting.prefix +
      value.substring(selectionStart, selectionEnd) +
      formatting.suffix +
      value.substring(selectionEnd);

    return {
      value: formattedValue,
      selectionStart: selectionStart + formatting.prefix.length,
      selectionEnd: selectionEnd + formatting.prefix.length
    };
  }

  function insertFormatting(formatting: Formatting) {
    if (!editorRef.value) return;

    const change = getEditorChange(formatting);
    if (!change) return;

    const { value, selectionStart, selectionEnd } = change;

    handler(value);
    scheduleSelection(selectionStart, selectionEnd);

    editorRef.value.focus();
  }

  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) return;

    uploading.value = true;

    try {
      const image = await imageUpload(file);
      if (!image) throw new Error('Image not uploaded');

      insertFormatting({
        prefix: `![${file.name}](${image.url})`,
        suffix: ''
      });

      editorRef.value?.focus();
    } catch (e) {
      uiStore.addNotification('error', 'Failed to upload image.');

      console.error('Failed to upload image', e);
    } finally {
      uploading.value = false;
    }
  }

  function heading() {
    insertFormatting({ prefix: '# ', suffix: '' });
  }

  function bold() {
    insertFormatting({ prefix: '**', suffix: '**' });
  }

  function italic() {
    insertFormatting({ prefix: '*', suffix: '*' });
  }

  function link() {
    insertFormatting({ prefix: '[', suffix: '](url)' });
  }

  return {
    hovered,
    uploading,
    heading,
    bold,
    italic,
    link
  };
}
