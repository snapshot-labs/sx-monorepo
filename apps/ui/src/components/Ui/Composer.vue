<script setup lang="ts">
import { stripHtmlTags } from '@/helpers/utils';

const model = defineModel<string>({ required: true });

defineProps<{
  error?: string;
  definition: any;
  noHtmlTags?: boolean;
}>();

const previewEnabled = ref(false);
const editorType = ref<'visual' | 'markdown'>('visual');

function setEditorType(type: 'visual' | 'markdown') {
  editorType.value = type;
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
          />
        </button>
      </template>
      <div class="grow" />
      <div>
        <div class="border border-skin-border flex space-x-1 rounded p-0.5">
          <button
            :class="{ 'bg-skin-border': editorType === 'markdown' }"
            class="p-0.5 size-[28px] rounded"
            @click="setEditorType('markdown')"
          >
            <UiTooltip title="Switch to markdown editor">
              <IH-bolt class="size-3" />
            </UiTooltip>
          </button>
          <button
            class="p-0.5 size-[28px] rounded"
            :class="{ 'bg-skin-border': editorType === 'visual' }"
            @click="setEditorType('visual')"
          >
            <UiTooltip title="Switch to visual editor">
              <IH-eye class="size-3" />
            </UiTooltip>
          </button>
        </div>
      </div>
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
        :body="noHtmlTags ? stripHtmlTags(model) : model"
      />
      <UiComposerMarkdown
        v-else
        v-model="model"
        :error="error"
        :definition="definition"
      />
    </template>
  </div>
</template>
