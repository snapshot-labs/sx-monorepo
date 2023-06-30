<script setup lang="ts">
import { computed } from 'vue';
import { Remarkable } from 'remarkable';
import { getUrl } from '@/helpers/utils';

const props = defineProps<{
  body: string;
}>();

const remarkable = new Remarkable({
  html: false,
  breaks: true,
  typographer: false,
  linkTarget: '_blank'
});
remarkable.core.ruler.disable([
  'abbr',
  'abbr2',
  'footnote_tail',
  'references',
  'replacements',
  'smartquotes'
]);
remarkable.block.ruler.disable([
  'code',
  'deflist',
  'fences',
  'footnote',
  'hr',
  'htmlblock',
  'lheading',
  'list',
  'table'
]);
remarkable.inline.ruler.disable([
  'autolink',
  'backticks',
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
  blockquote {
    margin-top: 0;
    margin-bottom: 16px;
  }

  p {
    font-size: 1em;
    color: var(--content-color);
  }

  blockquote {
    padding: 0 1em;
    color: var(--text-color);
    border-left: 0.25em solid var(--text-color);

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
}
</style>
