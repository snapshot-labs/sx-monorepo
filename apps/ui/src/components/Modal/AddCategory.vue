<script setup lang="ts">
import { Category } from '@/helpers/townhall/types';
import { clone } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import {
  useCreateCategoryMutation,
  useEditCategoryMutation
} from '@/queries/townhall';

const props = defineProps<{
  spaceId: number;
  categoryId: number | null;
  open: boolean;
  initialState?: Category;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { mutate: createCategory, isPending: isCreating } =
  useCreateCategoryMutation({
    spaceId: toRef(props, 'spaceId'),
    categoryId: toRef(props, 'categoryId')
  });
const { mutate: editCategory, isPending: isEditing } = useEditCategoryMutation({
  spaceId: toRef(props, 'spaceId'),
  categoryId: toRef(props, 'categoryId')
});

const form = ref(
  props.initialState ? clone(props.initialState) : clone(generateDefaultState())
);

const definition = computed(() => ({
  type: 'object',
  title: 'Category',
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: {
      type: 'string',
      title: 'Category name',
      minLength: 1,
      maxLength: 32,
      examples: ['General']
    },
    description: {
      type: 'string',
      title: 'Description',
      maxLength: 100,
      examples: ['Category description']
    }
  }
}));

const formErrors = computed(() => {
  const validator = getValidator(definition.value);
  return validator.validate(form.value, { skipEmptyOptionalFields: true });
});

const formValid = computed(() => {
  return Object.keys(formErrors.value).length === 0;
});

function generateDefaultState(): Category {
  return {
    id: '1',
    category_id: 1,
    parent_category_id: 0,
    parent_category: null,
    topic_count: 0,
    name: '',
    description: '',
    slug: ''
  };
}

async function handleSubmit() {
  if (props.initialState) {
    return editCategory(
      {
        id: props.initialState.category_id,
        name: form.value.name,
        description: form.value.description
      },
      { onSuccess: () => emit('close') }
    );
  }

  createCategory(
    {
      name: form.value.name,
      description: form.value.description
    },
    { onSuccess: () => emit('close') }
  );
}

watch(
  () => props.open,
  () => {
    form.value = clone(props.initialState || generateDefaultState());
  }
);
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3 v-text="initialState ? 'Edit category' : 'Add category'" />
    </template>
    <div class="s-box p-4">
      <UiForm
        :model-value="form"
        :error="formErrors"
        :definition="definition"
      />
    </div>
    <template #footer>
      <UiButton
        :loading="isCreating || isEditing"
        class="w-full"
        :disabled="!formValid"
        @click="handleSubmit"
      >
        Confirm
      </UiButton>
    </template>
  </UiModal>
</template>
