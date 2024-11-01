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

const remarkable = new Remarkable({
  html: false,
  breaks: true,
  typographer: false,
  linkTarget: '_blank',
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (e) {}
    }

    try {
      return hljs.highlightAuto(str).value;
    } catch (e) {}

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

const parsed = computed(() => {
  const formattedBody = props.body.replace(
    /ipfs:\/\/(\w+)/g,
    value => getUrl(value) || '#'
  );

  return remarkable.render(formattedBody);
});

onMounted(() => {
  const body = document.querySelector('.markdown-body');

  if (!body) return;

  body.querySelectorAll('pre>code').forEach(code => {
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
  <div class="markdown-body break-words" v-html="parsed" />
</template>

<style lang="scss" scoped>
@import '@/assets/styles/highlightjs/github.scss';

html.dark {
  @import '@/assets/styles/highlightjs/github-dark-dimmed.scss';
}

.markdown-body:deep() {
  font-size: 22px;
  line-height: 1.3;
  word-wrap: break-word;
  color: var(--content);

  > *:first-child {
    margin-top: 0 !important;
  }

  > *:last-child {
    padding-bottom: 0 !important;
    margin-bottom: 0 !important;
  }

  a {
    text-decoration: underline;
  }

  a:not([href]) {
    color: inherit;
    text-decoration: none;
  }
  img[alt^='discourse-emoji'] {
    display: inline;
    width: 20px;
    height: 20px;
  }

  img[alt^='discourse-thumbnail'] {
    display: inline;
    width: 35px;
    height: 35px;
  }
  p,
  blockquote,
  ul,
  ol,
  dl,
  table,
  pre {
    margin-top: 0;
    margin-bottom: 16px;
  }

  p {
    font-size: 1em;
  }

  hr {
    height: 0.25em;
    padding: 0;
    margin: 24px 0;
    background-color: #e1e4e8;
    border: 0;
  }

  blockquote {
    padding: 0 1em;
    color: rgba(var(--text));
    border-left: 0.25em solid rgba(var(--text));

    > :last-child {
      margin-bottom: 0;
    }

    > :first-child {
      margin-top: 0;
    }
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    line-height: 1.4 !important;
  }

  h1,
  h2 {
    font-size: 1.25em;
  }

  h3,
  h4,
  h5,
  h6 {
    font-size: 1em;
  }

  ul,
  ol {
    padding-left: 1em;
    padding-bottom: 8px;
  }

  ul.no-list,
  ol.no-list {
    padding: 0;
    list-style-type: none;
  }

  ul {
    list-style-type: disc;
  }

  ol {
    list-style-type: decimal;
  }

  ul ul,
  ul ol,
  ol ol,
  ol ul {
    margin-top: 0;
    margin-bottom: 0;
  }

  code {
    @apply bg-skin-border text-sm rounded-md px-1.5 py-0.5;
  }

  li {
    word-wrap: break-all;
  }

  li > p {
    margin-top: 16px;
  }

  li + li {
    margin-top: 0.25em;
  }

  dl {
    padding: 0;
  }

  dl dt {
    padding: 0;
    margin-top: 16px;
    font-size: 1em;
    font-style: italic;
    font-weight: 600;
  }

  dl dd {
    padding: 0 16px;
    margin-bottom: 16px;
  }

  table {
    display: block;
    width: 100%;
    overflow: auto;
  }

  table th {
    font-weight: 600;
  }

  table th,
  table td {
    padding: 6px 13px;
    border: 1px solid rgba(var(--border));
  }

  table thead tr,
  table tbody tr:nth-child(2n) {
    background-color: rgba(var(--bg));
    border-top: 1px solid #c6cbd1;
  }

  table tbody tr {
    background-color: rgba(var(--bg));
  }

  table img {
    background-color: transparent;
  }

  pre {
    @apply m-0 mb-3 p-0 rounded-lg border bg-transparent overflow-hidden;

    .title-bar {
      @apply p-2.5 px-3 text-base text-skin-text font-semibold flex justify-between items-center font-serif;
    }

    code {
      @apply p-3 m-0 bg-skin-border rounded-none border-none overflow-auto block;
    }
  }
}

// Those can't be nested because those don't work with :deep selector
.markdown-body::before {
  display: table;
  content: '';
}

.markdown-body::after {
  display: table;
  clear: both;
  content: '';
}
</style>
