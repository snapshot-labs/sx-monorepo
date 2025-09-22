<script setup lang="ts">
import { Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/vue-3/menus';

const props = defineProps<{
  editor: Editor;
  clippingContainer: HTMLElement | null;
}>();

function setLink() {
  const previousUrl = props.editor.getAttributes('link').href;
  const url = window.prompt('URL', previousUrl);

  // cancelled
  if (url === null) {
    return;
  }

  // empty
  if (url === '') {
    props.editor.chain().focus().extendMarkRange('link').unsetLink().run();

    return;
  }

  // update link
  props.editor
    .chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href: url })
    .run();
}
</script>

<template>
  <bubble-menu
    :editor="editor"
    :options="{
      shift: {
        boundary: clippingContainer
      }
    }"
  >
    <div class="bubble-menu">
      <button
        class="font-bold"
        :class="{ active: editor.isActive('bold') }"
        @click="editor.chain().focus().toggleBold().run()"
      >
        B
      </button>
      <button
        class="italic"
        :class="{ active: editor.isActive('italic') }"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        I
      </button>
      <button
        class="line-through"
        :class="{ active: editor.isActive('strike') }"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        S
      </button>
      <button
        class="text-[16px]"
        :class="{ active: editor.isActive('heading', { level: 2 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        class="text-[16px]"
        :class="{ active: editor.isActive('heading', { level: 3 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        H3
      </button>
      <button :class="{ active: editor.isActive('link') }" @click="setLink">
        <IH-link class="size-3" />
      </button>

      <button
        :class="{ active: editor.isActive('bulletList') }"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <IH-list-bullet class="size-4" />
      </button>
      <button
        :class="{ active: editor.isActive('orderedList') }"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <IC-numbered-list class="size-3.5" />
      </button>
      <button
        :class="{ active: editor.isActive('code') }"
        @click="editor.chain().focus().toggleCode().run()"
      >
        <IH-code-bracket />
      </button>
      <button
        :class="{ active: editor.isActive('codeBlock') }"
        @click="editor.chain().focus().toggleCodeBlock().run()"
      >
        <IH-code-bracket-square />
      </button>
      <button
        class="text-[28px] leading-none pt-2"
        :class="{ active: editor.isActive('blockquote') }"
        @click="editor.chain().focus().toggleBlockquote().run()"
      >
        ”
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

    &.active {
      @apply bg-skin-border/50;

      &:hover {
        @apply bg-skin-border;
      }
    }
  }
}
</style>
