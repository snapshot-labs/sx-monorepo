<script setup lang="ts">
import { Textarea } from '@ui-sdk/vue/textarea';

defineOptions({ inheritAttrs: false });

const model = defineModel<string>();

const props = defineProps<{
  error?: string;
  required?: boolean;
  definition: any;
}>();

const { isDirty } = useDirty(model, props.definition);

// Large values (e.g. 61k-line whitelist) make every model update costly, so
// the model syncs 500ms after typing stops while the field keeps up
const LARGE_VALUE_THRESHOLD = 100_000;

const text = useFieldText(model, value => value);

const updateModelDebounced = useDebounceFn(() => {
  model.value = text.value;
}, 500);

function update(value: string) {
  text.value = value;
  if (value.length > LARGE_VALUE_THRESHOLD) {
    updateModelDebounced();
  } else {
    model.value = value;
  }
}
</script>

<template>
  <UiWrapperInput
    :definition="definition"
    :error="error"
    :dirty="isDirty"
    :required="required"
    :input-value-length="model?.length"
  >
    <Textarea
      :value="text"
      class="s-input"
      v-bind="$attrs"
      :placeholder="definition.examples && definition.examples[0]"
      @value-change="update"
    />
  </UiWrapperInput>
</template>
