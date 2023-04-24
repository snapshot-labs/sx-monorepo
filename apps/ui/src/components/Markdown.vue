<script setup lang="ts">
import { computed } from 'vue';
import { Remarkable } from 'remarkable';

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

const parsed = computed(() => remarkable.render(props.body));
</script>

<template>
  <div class="markdown-body break-words" v-html="parsed" />
</template>

<style lang="scss">
.markdown-body {
  font-size: 22px;
  line-height: 1.3;
  word-wrap: break-word;
}
.markdown-body::before {
  display: table;
  content: '';
}
.markdown-body blockquote {
  color: var(--text-color);
  border-left-color: var(--text-color);
}
.markdown-body::after {
  display: table;
  clear: both;
  content: '';
}
.markdown-body > *:first-child {
  margin-top: 0 !important;
}
.markdown-body > *:last-child {
  margin-bottom: 0 !important;
}
.markdown-body a:not([href]) {
  color: inherit;
  text-decoration: none;
}
.markdown-body p,
.markdown-body blockquote {
  margin-top: 0;
  margin-bottom: 16px;
}
.markdown-body blockquote {
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
}
.markdown-body blockquote > :first-child {
  margin-top: 0;
}
.markdown-body blockquote > :last-child {
  margin-bottom: 0;
}
.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.4 !important;
}
.markdown-body h1,
.markdown-body h2 {
  font-size: 1.25em;
}
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  font-size: 1em;
}
.markdown-body p {
  font-size: 1em;
  color: var(--content-color);
}
</style>
