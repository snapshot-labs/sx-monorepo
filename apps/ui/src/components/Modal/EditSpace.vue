<script setup lang="ts">
import { reactive, computed, watch } from 'vue';
import { clone } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';

type FormState = { name: string; about?: string; website?: string };

const DEFAULT_FORM_STATE: FormState = {
  name: '',
  about: '',
  website: ''
};

const definition = {
  type: 'object',
  title: 'Space',
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: {
      type: 'string',
      title: 'Name',
      minLength: 1,
      examples: ['Space name']
    },
    about: {
      type: 'string',
      format: 'long',
      title: 'About',
      examples: ['Space description']
    },
    website: {
      type: 'string',
      title: 'Website',
      examples: ['Space website URL']
    }
  }
};

const props = defineProps<{
  open: boolean;
  initialState?: FormState;
}>();

const emit = defineEmits(['add', 'close']);

const form: FormState = reactive(clone(DEFAULT_FORM_STATE));

const formErrors = computed(() => validateForm(definition, form));

function handleSubmit() {
  emit('close');
}

watch(
  () => props.open,
  () => {
    if (!props.initialState) return;

    form.name = props.initialState.name;
    form.about = props.initialState.about;
    form.website = props.initialState.website;
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3>Edit profile</h3>
    </template>
    <div class="s-box p-4">
      <SIObject v-model="form" :error="formErrors" :definition="definition" />
    </div>
    <template #footer>
      <UiButton class="w-full" :disabled="Object.keys(formErrors).length > 0" @click="handleSubmit">
        Save
      </UiButton>
    </template>
  </UiModal>
</template>
