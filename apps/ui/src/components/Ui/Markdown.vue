<script setup lang="ts">
import { icons } from '@iconify-json/heroicons-outline';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import { solidity } from 'highlightjs-solidity';
import { Remarkable } from 'remarkable';
import { linkify } from 'remarkable/linkify';
import { getUrl } from '@/helpers/utils';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('python', python);
hljs.registerLanguage('solidity', solidity);

const props = defineProps<{
  body: string;
}>();

const { copy } = useClipboard();

const selfRef = ref<HTMLDivElement>();

const remarkable = new Remarkable({
  html: false,
  breaks: true,
  typographer: false,
  linkTarget: '_blank',
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch {}
    }

    try {
      return hljs.highlightAuto(str).value;
    } catch {}

    return '';
  }
}).use(linkify);
remarkable.core.ruler.disable([
  'abbr',
  'abbr2',
  'footnote_tail',
  'replacements',
  'smartquotes'
]);
remarkable.block.ruler.disable([
  'code',
  'deflist',
  'footnote',
  'htmlblock',
  'lheading'
]);
remarkable.inline.ruler.disable([
  'autolink',
  'del',
  'entity',
  'escape',
  'footnote_inline',
  'footnote_ref',
  'htmltag',
  'ins',
  'mark',
  'sub',
  'sup',
  'text'
]);
remarkable.inline.ruler.enable(['del']);

const parsed = computed(() => {
  const formattedBody = props.body.replace(
    /ipfs:\/\/(\w+)/g,
    value => getUrl(value) || '#'
  );

  return remarkable.render(formattedBody);
});

onMounted(() => {
  if (!selfRef.value) return;

  selfRef.value.querySelectorAll('pre>code').forEach(code => {
    const parent = code.parentElement!;

    const copyButton = document.createElement('button');
    const copySvg = `<svg viewBox="0 0 24 24" width="20px" height="20px">${icons.icons.duplicate.body}</svg>`;
    copyButton.classList.add('text-skin-text');
    copyButton.setAttribute('type', 'button');
    copyButton.innerHTML = copySvg;
    copyButton.addEventListener('click', () => {
      if (parent !== null) {
        copy(code.textContent!);

        copyButton.innerHTML = `<svg viewBox="0 0 24 24" width="20px" height="20px">${icons.icons.check.body}</svg>`;
        copyButton.classList.add('!text-skin-success');
        setTimeout(() => {
          copyButton.innerHTML = copySvg;
          copyButton.classList.remove('!text-skin-success');
        }, 1000);
      }
    });

    const titleBar = document.createElement('div');
    titleBar.classList.add('title-bar');

    const language = document.createElement('div');
    language.innerHTML =
      code.getAttribute('class')?.split('language-')[1] || '';

    titleBar.append(language);
    titleBar.append(copyButton);
    parent.prepend(titleBar);
  });
});
</script>

<template>
  <div ref="selfRef" class="markdown-body" v-html="parsed" />
</template>
