<script setup lang="ts">
import InputDuration from '@/components/Ui/InputDuration.vue';
import InputNumber from '@/components/Ui/InputNumber.vue';
import InputString from '@/components/Ui/InputString.vue';
import { validateForm } from '@/helpers/validation';

type Definition = {
  type: 'string' | 'number' | 'integer';
  format?: string;
  examples?: string[];
  maximum?: number;
  errorMessage?: Record<string, string>;
};

const props = withDefaults(
  defineProps<{
    initialValue: string | number;
    editable: boolean;
    loading?: boolean;
    definition: Definition;
    customErrorValidation?: (value: string | number) => string | undefined;
  }>(),
  { loading: false }
);

const emit = defineEmits<{
  (e: 'save', value: string | number);
}>();

const editing = ref(false);
const inputValue: Ref<string | number> = ref(props.initialValue);

const Component = computed(() => {
  switch (props.definition.type) {
    case 'integer':
    case 'number':
      if (props.definition.format === 'duration') return InputDuration;

      return InputNumber;
    default:
      return InputString;
  }
});
const formErrors = computed(() => {
  const errors = validateForm(
    {
      type: 'object',
      title: 'Editable',
      additionalProperties: false,
      required: ['value'],
      properties: {
        value: props.definition
      }
    },
    {
      value: inputValue.value
    }
  );

  const customError = props.customErrorValidation?.(inputValue.value);
  if (customError) errors.value = customError;

  return errors;
});

function handleEdit() {
  editing.value = true;
}

function handleSave() {
  emit('save', inputValue.value);
  editing.value = false;
}

watch(
  () => props.initialValue,
  () => {
    inputValue.value = props.initialValue;
    editing.value = false;
  }
);
</script>

<template>
  <div
    class="flex items-center gap-2"
    :class="{
      'mt-2': editing,
      'w-fit': definition.format !== 'duration',
      's-box w-full max-w-xl': definition.format === 'duration'
    }"
  >
    <UiLoading v-if="loading" />
    <template v-else>
      <component
        :is="Component"
        v-if="editing"
        v-model="inputValue"
        class="!mb-0 flex-1"
        :definition="definition"
        :error="formErrors.value"
      />
      <slot v-else />
      <template v-if="editing">
        <div
          class="flex gap-2 relative"
          :class="{
            'top-[-19.5px]':
              definition.format !== 'duration' && !!formErrors.value,
            'top-[-18.5px]':
              definition.format === 'duration' && !!formErrors.value,
            '-top-1.5': definition.format === 'duration'
          }"
        >
          <button
            type="button"
            :disabled="!!formErrors.value"
            class="hover:opacity-80"
            @click="handleSave"
          >
            <IH-check />
          </button>
          <button
            type="button"
            class="hover:opacity-80"
            @click="editing = !editing"
          >
            <IH-x />
          </button>
        </div>
      </template>
      <template v-else>
        <button
          v-if="editable"
          type="button"
          class="hover:opacity-80"
          @click="handleEdit"
        >
          <IH-pencil />
        </button>
      </template>
    </template>
  </div>
</template>
