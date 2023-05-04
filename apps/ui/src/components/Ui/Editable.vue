<script setup lang="ts">
import SINumber from '@/components/S/INumber.vue';
import SIString from '@/components/S/IString.vue';
import { validateForm } from '@/helpers/validation';

type Definition = {
  type: 'string' | 'integer';
  format?: string;
  examples: string[];
};

const props = withDefaults(
  defineProps<{
    initialValue: string | number;
    editable: boolean;
    loading?: boolean;
    definition: Definition;
  }>(),
  { loading: false }
);

const emit = defineEmits<{
  (e: 'save', value: string | number);
}>();

const editing = ref(false);
const inputValue = ref(props.initialValue);

const Component = computed(() => {
  if (props.definition.type === 'integer') return SINumber;
  return SIString;
});
const formErrors = computed(() =>
  validateForm(
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
  )
);
function handleSave() {
  emit('save', inputValue.value);
  editing.value = false;
}
</script>

<template>
  <div class="flex items-center gap-2 group w-fit" :class="{ 'mt-2': editing }">
    <UiLoading v-if="loading" />
    <template v-else>
      <component
        :is="Component"
        v-if="editing"
        v-model="inputValue"
        class="!mb-0"
        :definition="definition"
        :error="formErrors.value"
      />
      <slot v-else />
      <template v-if="editing">
        <div
          class="flex gap-2 relative"
          :class="{
            'top-[-15px]': !!formErrors.value
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
