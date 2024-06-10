<script setup lang="ts">
import { clone } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import { User } from '@/types';

const props = defineProps<{
  open: boolean;
  user: User;
}>();

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
      title: 'Avatar',
      default: props.user.id
    },
    name: {
      type: 'string',
      title: 'Name',
      minLength: 1,
      maxLength: 32,
      examples: ['Display name']
    },
    about: {
      type: 'string',
      format: 'long',
      title: 'About',
      maxLength: 256,
      examples: ['Tell your story']
    },
    github: {
      type: 'string',
      format: 'github-handle',
      title: 'GitHub',
      maxLength: 39,
      examples: ['GitHub handle']
    },
    twitter: {
      type: 'string',
      format: 'twitter-handle',
      title: 'X (Twitter)',
      maxLength: 15,
      examples: ['X (Twitter) handle']
    }
  }
};

const actions = useActions();
const usersStore = useUsersStore();

const form = ref<Record<string, any>>(clone(props.user));
const sending = ref(false);

const formErrors = computed(() =>
  validateForm(definition, form.value, { skipEmptyOptionalFields: true })
);

async function handleSubmit() {
  sending.value = true;

  try {
    if (await actions.updateUser(form.value as User)) {
      await fetch(`https://cdn.stamp.fyi/clear/avatar/eth:${props.user.id}`);
      usersStore.fetchUser(props.user.id, true);
      emit('close');
    }
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <UiModal :open="open" data-model="user-modal" @close="$emit('close')">
    <template #header>
      <h3>Edit profile</h3>
    </template>
    <UiInputStampCover v-model="(form as any).cover" :user="user" />
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
[data-model='user-modal'] [path='avatar'] {
  @apply rounded-full;
}
</style>
