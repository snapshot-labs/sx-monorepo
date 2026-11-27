<script setup lang="ts">
import { UiLoading } from '@snapshot-labs/tune';
import { lsGet, lsSet, stripHtmlTags } from '@/helpers/utils';

type EditorType = 'visual' | 'markdown';

const DEFAULT_EDITOR: EditorType = 'markdown';

const model = defineModel<string>({ required: true });

defineProps<{
  error?: string;
  definition: any;
  noHtmlTags?: boolean;
}>();

const previewEnabled = ref(false);
const editorType = ref<EditorType>(lsGet('editor') ?? DEFAULT_EDITOR);

function toggleEditor() {
  editorType.value = editorType.value === 'visual' ? 'markdown' : 'visual';
  lsSet('editor', editorType.value);
}

const AsyncVisualEditor = defineAsyncComponent({
  loader: () => import('./ComposerVisual.vue'),
  loadingComponent: UiLoading
});
</script>

<template>
  <div>
    <div class="h-[40px] flex space-x-3">
      <UiTabs
        v-if="editorType === 'markdown'"
        :model-value="previewEnabled ? 'preview' : 'write'"
        aria-label="Editor"
        class="flex space-x-3"
        @update:model-value="value => (previewEnabled = value === 'preview')"
      >
        <UiTab v-slot="{ selected }" value="write">
          <UiLabel
            :is-active="selected"
            text="Write"
            class="border-transparent"
          />
        </UiTab>
        <UiTab v-slot="{ selected }" value="preview">
          <UiLabel
            :is-active="selected"
            text="Preview"
            class="border-transparent"
          />
        </UiTab>
      </UiTabs>
      <div class="grow" />
      <UiButton
        plain
        :aria-label="`Switch to ${editorType === 'visual' ? 'Markdown' : 'visual'} editor`"
        class="flex items-center space-x-1.5"
        @click="toggleEditor"
      >
        <IH-eye v-if="editorType === 'markdown'" />
        <IC-markdown v-else class="size-[28px]" />
        <span class="hidden sm:inline-block">
          Switch to {{ editorType === 'visual' ? 'Markdown' : 'visual' }} editor
        </span>
      </UiButton>
    </div>
    <div class="min-h-[260px] mb-3">
      <AsyncVisualEditor
        v-if="editorType === 'visual'"
        v-model="model"
        class="min-h-[260px]"
        :error="error"
        :definition="definition"
      />
      <template v-else>
        <UiMarkdown
          v-if="previewEnabled"
          class="px-3 py-2 border rounded-lg min-h-[260px]"
          :body="noHtmlTags ? stripHtmlTags(model) : model"
        />
        <UiComposerMarkdown
          v-else
          v-model="model"
          class="min-h-[260px]"
          :error="error"
          :definition="definition"
        />
      </template>
    </div>
  </div>
</template>
