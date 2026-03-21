<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const model = defineModel<string>();

const props = defineProps<{
  error?: string;
  required?: boolean;
  definition: any;
}>();

const { isDirty } = useDirty(model, props.definition);
</script>

<template>
  <UiWrapperInput
    v-slot="{ id }"
    :definition="definition"
    :error="error"
    :dirty="isDirty"
    :required="required"
    :input-value-length="model?.length"
  >
    <textarea
      :id="id"
      v-model="model"
      class="s-input"
      v-bind="$attrs"
      :placeholder="definition.examples && definition.examples[0]"
    />
  </UiWrapperInput>
</template>
