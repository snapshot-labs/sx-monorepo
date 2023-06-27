type Formatting = {
  prefix: string;
  suffix: string;
};

type ChangeHandler = (value: string) => void;

export function useMarkdownEditor(
  editorRef: Ref<HTMLTextAreaElement | null>,
  handler: ChangeHandler
) {
  const shortcuts = {
    b: bold,
    i: italic,
    k: link
  };

  watch(editorRef, el => {
    if (!el) return;

    el.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && shortcuts[e.key]) {
        e.preventDefault();
        shortcuts[e.key]();
      }
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
    heading,
    bold,
    italic,
    link
  };
}
