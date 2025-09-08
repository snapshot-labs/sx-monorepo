<script setup lang="ts">
import { stripHtmlTags } from '@/helpers/utils';

const model = defineModel<string>({ required: true });

defineProps<{
  error?: string;
  definition: any;
  noHtmlTags?: boolean;
}>();

const previewEnabled = ref(false);
const editorType = ref<'visual' | 'markdown'>('markdown');

function toggleEditorType() {
  editorType.value = editorType.value === 'visual' ? 'markdown' : 'visual';
}
</script>

<template>
  <div>
    <div class="flex space-x-3">
      <template v-if="editorType === 'markdown'">
        <button type="button" @click="previewEnabled = false">
          <UiLabel
            :is-active="!previewEnabled"
            text="Write"
            class="border-transparent"
          />
        </button>
        <button type="button" @click="previewEnabled = true">
          <UiLabel
            :is-active="previewEnabled"
            text="Preview"
            class="border-transparent"
          /></button
      ></template>
      <div class="grow" />
      <button class="py-2" @click="toggleEditorType">
        {{ editorType === 'markdown' ? 'Visual editor' : 'Markdown editor' }}
      </button>
    </div>
    <UiComposerVisual
      v-if="editorType === 'visual'"
      v-model="model"
      :error="error"
      :definition="definition"
    />
    <template v-else>
      <UiMarkdown
        v-if="previewEnabled"
        class="px-3 py-2 border rounded-lg mb-[14px] min-h-[260px]"
        :body="noHtmlTags ? stripHtmlTags(model) : model" />
      <UiComposerMarkdown
        v-else
        v-model="model"
        :error="error"
        :definition="definition"
    /></template>
  </div>
</template>
