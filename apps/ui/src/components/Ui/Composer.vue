<script setup lang="ts">
const model = defineModel<string>({ required: true });

defineProps<{
  error?: string;
  definition: any;
}>();

const previewEnabled = ref(false);
</script>

<template>
  <div>
    <div class="flex space-x-3">
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
    </div>
    <UiMarkdown
      v-if="previewEnabled"
      class="px-3 py-2 border rounded-lg mb-[14px] min-h-[260px]"
      :body="model"
    />
    <UiComposerMarkdown
      v-else
      v-model="model"
      :error="error"
      :definition="definition"
    />
  </div>
</template>
