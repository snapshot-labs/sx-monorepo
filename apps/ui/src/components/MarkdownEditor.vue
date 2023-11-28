<script setup lang="ts">
defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string);
}>();

const editorContainerRef = ref<HTMLDivElement | null>(null);
const editorFileInputRef = ref<HTMLInputElement | null>(null);
const editorRef = ref<HTMLTextAreaElement | null>(null);
const editor = useMarkdownEditor(editorRef, editorFileInputRef, editorContainerRef, value => {
  emit('update:modelValue', value);
});
</script>

<template>
  <div
    ref="editorContainerRef"
    class="rounded-lg mb-3 border"
    :class="{
      'ring-2': editor.hovered.value
    }"
  >
    <div class="flex justify-end gap-1 py-2 px-3">
      <UiTooltip title="Add heading text">
        <button
          class="p-1 w-[26px] h-[26px] leading-[18px] hover:text-skin-link rounded focus-visible:ring-1"
          @click="editor.heading"
        >
          H
        </button>
      </UiTooltip>
      <UiTooltip title="Add bold text">
        <button
          class="p-1 w-[26px] h-[26px] leading-[18px] font-bold hover:text-skin-link rounded focus-visible:ring-1"
          @click="editor.bold"
        >
          B
        </button>
      </UiTooltip>
      <UiTooltip title="Add italic text">
        <button
          class="p-1 w-[26px] h-[26px] leading-[18px] italic hover:text-skin-link rounded focus-visible:ring-1"
          @click="editor.italic"
        >
          <span class="mono !text-[17px] !font-normal">I</span>
        </button>
      </UiTooltip>
      <UiTooltip title="Add a link" class="w-[26px] h-[26px]">
        <button
          class="p-1 w-[26px] h-[26px] leading-[18px] italic hover:text-skin-link rounded focus-visible:ring-1"
          @click="editor.link"
        >
          <IS-link class="w-[18px] h-[18px]" />
        </button>
      </UiTooltip>
      <UiTooltip title="Add an image" class="w-[26px] h-[26px]">
        <label
          class="flex justify-center p-1 w-[26px] h-[26px] leading-[18px] italic hover:text-skin-link rounded focus-visible:ring-1"
        >
          <input
            ref="editorFileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            :disabled="editor.uploading.value"
          />
          <UiLoading v-if="editor.uploading.value" :width="14" :height="14" class="inline-block" />
          <IS-photo v-else class="w-[18px] h-[18px]" />
        </label>
      </UiTooltip>
    </div>
    <div class="s-base">
      <textarea
        ref="editorRef"
        :value="modelValue"
        maxlength="9600"
        class="s-input h-[200px] !rounded-t-none !mb-0 !pt-[15px]"
        @input="event => emit('update:modelValue', (event.target as HTMLInputElement).value)"
      />
    </div>
  </div>
</template>
