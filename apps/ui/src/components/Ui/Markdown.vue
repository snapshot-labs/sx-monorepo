<script setup lang="ts">
import { computed } from 'vue';
import { Remarkable } from 'remarkable';
import { linkify } from 'remarkable/linkify';
import { getUrl } from '@/helpers/utils';

const props = defineProps<{
  body: string;
}>();

const remarkable = new Remarkable({
  html: false,
  breaks: true,
  typographer: false,
  linkTarget: '_blank'
}).use(linkify);
remarkable.core.ruler.disable(['abbr', 'abbr2', 'footnote_tail', 'replacements', 'smartquotes']);
remarkable.block.ruler.disable(['code', 'deflist', 'fences', 'footnote', 'htmlblock', 'lheading']);
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
  const formattedBody = props.body.replace(/ipfs:\/\/(\w+)/g, value => getUrl(value) || '#');

  return remarkable.render(formattedBody);
});
</script>

<template>
  <div class="markdown-body break-words" v-html="parsed" />
</template>

<style lang="scss">
.markdown-body {
  font-size: 22px;
  line-height: 1.3;
  word-wrap: break-word;

  &::before {
    display: table;
    content: '';
  }

  &::after {
    display: table;
    clear: both;
    content: '';
  }

  > *:first-child {
    margin-top: 0 !important;
  }

  > *:last-child {
    margin-bottom: 0 !important;
  }

  a {
    text-decoration: underline;
  }

  a:not([href]) {
    color: inherit;
    text-decoration: none;
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
    color: rgba(var(--content));
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
    padding-left: 2em;
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
    @apply bg-skin-border text-[16px] rounded-md px-[6px] py-[2px];
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
}
</style>
