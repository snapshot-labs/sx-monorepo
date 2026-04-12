<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const model = defineModel<string>();

const props = defineProps<{
  error?: string;
  required?: boolean;
  definition: any;
}>();

const { isDirty } = useDirty(model, props.definition);

// Large values (e.g. 61k-line whitelist) cause browser layout thrashing when
// Vue re-sets the textarea DOM value on every reactive update. For these cases
// we debounce model sync so typing stays responsive while validation still
// fires after 500ms.
const LARGE_VALUE_THRESHOLD = 100_000;
const textareaRef = ref<HTMLTextAreaElement>();

watch([textareaRef, model], ([el, val]) => {
  if (el && el.value !== (val ?? '')) {
    el.value = val ?? '';
  }
});

const updateModelDebounced = useDebounceFn((el: HTMLTextAreaElement) => {
  model.value = el.value;
}, 500);

function onInput(e: Event) {
  const el = e.target as HTMLTextAreaElement;

  if (el.value.length > LARGE_VALUE_THRESHOLD) {
    updateModelDebounced(el);
  } else {
    model.value = el.value;
  }
}
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
      ref="textareaRef"
      class="s-input"
      v-bind="$attrs"
      :placeholder="definition.examples && definition.examples[0]"
      @input="onInput"
    />
  </UiWrapperInput>
</template>
