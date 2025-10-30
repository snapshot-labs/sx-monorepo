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
  <BubbleMenu
    :editor="editor"
    :options="
      clippingContainer
        ? {
            shift: {
              boundary: clippingContainer
            }
          }
        : {}
    "
  >
    <div class="bubble-menu" data-no-sidebar-swipe>
      <button
        type="button"
        title="Bold"
        class="font-bold"
        :class="{ active: editor.isActive('bold') }"
        @click="editor.chain().focus().toggleBold().run()"
      >
        B
      </button>
      <button
        type="button"
        title="Italic"
        class="italic"
        :class="{ active: editor.isActive('italic') }"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        I
      </button>
      <button
        type="button"
        title="Strikethrough"
        class="line-through"
        :class="{ active: editor.isActive('strike') }"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        S
      </button>
      <button
        type="button"
        title="Heading 2"
        class="text-[16px]"
        :class="{ active: editor.isActive('heading', { level: 2 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        type="button"
        title="Heading 3"
        class="text-[16px]"
        :class="{ active: editor.isActive('heading', { level: 3 }) }"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        H3
      </button>
      <button
        type="button"
        title="Insert link"
        :class="{ active: editor.isActive('link') }"
        @click="setLink"
      >
        <IH-link class="size-3" />
      </button>

      <button
        type="button"
        title="Bullet list"
        :class="{ active: editor.isActive('bulletList') }"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <IH-list-bullet class="size-4" />
      </button>
      <button
        type="button"
        title="Numbered list"
        :class="{ active: editor.isActive('orderedList') }"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <IC-numbered-list class="size-3.5" />
      </button>
      <button
        type="button"
        title="Inline code"
        :class="{ active: editor.isActive('code') }"
        @click="editor.chain().focus().toggleCode().run()"
      >
        <IH-code-bracket />
      </button>
      <button
        type="button"
        title="Code block"
        :class="{ active: editor.isActive('codeBlock') }"
        @click="editor.chain().focus().toggleCodeBlock().run()"
      >
        <IH-code-bracket-square />
      </button>
      <button
        type="button"
        title="Blockquote"
        class="text-[28px] leading-none pt-2"
        :class="{ active: editor.isActive('blockquote') }"
        @click="editor.chain().focus().toggleBlockquote().run()"
      >
        ”
      </button>
    </div>
  </BubbleMenu>
</template>

<style lang="scss" scoped>
.bubble-menu {
  @apply border border-skin-border bg-skin-bg shadow-sm rounded-lg flex space-x-0.5 p-1 max-w-full overflow-x-auto;

  button {
    @apply px-2 rounded-md text-center min-w-[26px] flex-shrink-0;

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
