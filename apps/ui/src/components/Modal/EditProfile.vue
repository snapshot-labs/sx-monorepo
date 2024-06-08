<script setup lang="ts">
import { validateForm } from '@/helpers/validation';
import { User } from '@/types';

const props = defineProps<{
  open: boolean;
  user: User;
}>();

const actions = useActions();

const emit = defineEmits<{
  (e: 'close');
}>();

const definition = {
  type: 'object',
  title: 'User',
  additionalProperties: false,
  required: [],
  properties: {
    avatar: {
      type: 'string',
      format: 'stamp',
      title: 'Avatar'
    },
    name: {
      type: 'string',
      title: 'Name',
      minLength: 1,
      examples: ['Display name']
    },
    about: {
      type: 'string',
      format: 'long',
      title: 'About',
      examples: ['Tell your story']
    },
    github: {
      type: 'string',
      format: 'github-handle',
      title: 'GitHub',
      examples: ['GitHub handle']
    },
    twitter: {
      type: 'string',
      format: 'twitter-handle',
      title: 'X (Twitter)',
      examples: ['X (Twitter) handle']
    }
  }
};

const form = ref<Record<string, any>>({
  avatar: props.user.avatar,
  cover: props.user.cover,
  name: props.user.name,
  about: props.user.about,
  github: props.user.github,
  twitter: props.user.twitter
});
const sending = ref(false);

const formErrors = computed(() =>
  validateForm(definition, form.value, { skipEmptyOptionalFields: true })
);

async function handleSubmit() {
  sending.value = true;

  try {
    if (await actions.updateUser(form.value as User)) {
      emit('close');
    }
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3>Edit profile</h3>
    </template>

    <UiInputStampCover v-model="(form as any).cover" :user="user" type="user" />
    <div class="s-box p-4 -mt-[80px]">
      <UiForm v-model="form" :error="formErrors" :definition="definition" />
    </div>
    <template #footer>
      <UiButton
        class="w-full"
        :disabled="Object.keys(formErrors).length > 0"
        :loading="sending"
        @click="handleSubmit"
      >
        Save
      </UiButton>
    </template>
  </UiModal>
</template>

<style>
.modal-body [path='avatar'] {
  @apply rounded-full;
}
</style>
