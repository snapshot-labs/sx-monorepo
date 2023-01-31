<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useActions } from '@/composables/useActions';
import { clone } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import type { Space } from '@/types';

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
  space: Space;
}>();

const emit = defineEmits(['add', 'close']);

const { updateMetadata } = useActions();

const sending = ref(false);
const form: FormState = reactive(clone(DEFAULT_FORM_STATE));

const formErrors = computed(() => validateForm(definition, form));

async function handleSubmit() {
  sending.value = true;

  try {
    await updateMetadata(props.space, {
      name: form.name,
      description: form.about || '',
      external_url: form.website || ''
    });
    emit('close');
  } finally {
    sending.value = false;
  }
}

onMounted(() => {
  form.name = props.space.name;
  form.about = props.space.about;
  form.website = '';
});
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
      <UiButton
        class="w-full"
        :loading="sending"
        :disabled="Object.keys(formErrors).length > 0"
        @click="handleSubmit"
      >
        Save
      </UiButton>
    </template>
  </UiModal>
</template>
