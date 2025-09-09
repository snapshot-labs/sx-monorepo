<script setup lang="ts">
import { BubbleMenu } from '@tiptap/vue-3/menus';

defineProps<{
  editor: any;
}>();
</script>

<template>
  <bubble-menu :editor="editor">
    <div class="bubble-menu">
      <button
        class="font-bold"
        :class="{ 'is-active': editor.isActive('bold') }"
        @click="editor.chain().focus().toggleBold().run()"
      >
        B
      </button>
      <button
        class="italic"
        :class="{ 'is-active': editor.isActive('italic') }"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        I
      </button>
      <button
        class="line-through"
        :class="{ 'is-active': editor.isActive('strike') }"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        S
      </button>
      <button
        :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        H3
      </button>
      <button
        :class="{ 'is-active': editor.isActive('heading', { level: 4 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 4 }).run()"
      >
        H4
      </button>
      <button
        :class="{ 'is-active': editor.isActive('orderedList') }"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <IH-list-bullet />
      </button>
      <button
        :class="{ 'is-active': editor.isActive('bulletList') }"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <IH-list-bullet />
      </button>
      <button
        :class="{ 'is-active': editor.isActive('code') }"
        @click="editor.chain().focus().toggleCode().run()"
      >
        <IH-code-bracket />
      </button>
      <button
        :class="{ 'is-active': editor.isActive('link') }"
        @click="editor.chain().focus().toggleLink().run()"
      >
        <IH-link />
      </button>
      <button><IH-photo /></button>
      <button
        :class="{ 'is-active': editor.isActive('codeBlock') }"
        @click="editor.chain().focus().toggleCodeBlock().run()"
      >
        <IH-code-bracket />
      </button>
      <button
        :class="{ 'is-active': editor.isActive('blockquote') }"
        @click="editor.chain().focus().toggleBlockquote().run()"
      >
        "
      </button>
    </div>
  </bubble-menu>
</template>

<style lang="scss" scoped>
.bubble-menu {
  @apply border border-skin-border bg-skin-bg shadow-sm rounded-lg flex space-x-0.5 p-1;

  button {
    @apply px-2 rounded-md text-center min-w-[26px];

    &:hover {
      @apply bg-skin-border;
    }

    &.is-active {
      @apply bg-skin-border/50;

      &:hover {
        @apply bg-skin-border;
      }
    }
  }
}
</style>
