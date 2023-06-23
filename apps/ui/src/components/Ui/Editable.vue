<script setup lang="ts">
import SIDuration from '@/components/S/IDuration.vue';
import SINumber from '@/components/S/INumber.vue';
import SIString from '@/components/S/IString.vue';
import { validateForm } from '@/helpers/validation';

type Definition = {
  type: 'string' | 'number' | 'integer';
  format?: string;
  examples?: string[];
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
const inputValue = ref(props.initialValue);

const Component = computed(() => {
  switch (props.definition.type) {
    case 'integer':
    case 'number':
      if (props.definition.format === 'duration') return SIDuration;

      return SINumber;
    default:
      return SIString;
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

function handleSave() {
  emit('save', inputValue.value);
  editing.value = false;
}
</script>

<template>
  <div
    class="flex items-center gap-2 group"
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
            'top-[-19.5px]': definition.format !== 'duration' && !!formErrors.value,
            'top-[-18.5px]': definition.format === 'duration' && !!formErrors.value,
            'top-[-6px]': definition.format === 'duration'
          }"
        >
          <button :disabled="!!formErrors.value" class="hover:opacity-80" @click="handleSave">
            <IH-check />
          </button>
          <button class="hover:opacity-80" @click="editing = !editing">
            <IH-x />
          </button>
        </div>
      </template>
      <template v-else>
        <button
          v-if="editable"
          class="hidden group-hover:block hover:opacity-80"
          @click="editing = !editing"
        >
          <IH-pencil />
        </button>
      </template>
    </template>
  </div>
</template>
