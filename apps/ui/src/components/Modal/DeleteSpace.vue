<script setup lang="ts">
import { clone } from '@/helpers/utils';

const DEFAULT_FORM_STATE = {
  id: '',
  confirmed: false
};

const props = defineProps<{
  open: boolean;
  spaceId: string;
  initialState?: any;
}>();

const emit = defineEmits<{
  (e: 'confirm');
  (e: 'close');
}>();

const form: Ref<{
  id: string;
  confirmed: boolean;
}> = ref(clone(DEFAULT_FORM_STATE));

const isValid = computed(
  () => form.value.confirmed && form.value.id === props.spaceId
);

function handleSubmit() {
  emit('confirm');
  emit('close');
}

watch(
  () => props.open,
  () => {
    form.value = clone(DEFAULT_FORM_STATE);
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3>Confirm action</h3>
    </template>
    <div class="s-box p-4">
      <UiMessage type="danger">
        Do you really want to delete this space? This action cannot be undone
        and you will not be able to use {{ spaceId }} again to create another
        space.
      </UiMessage>
      <UiInputString
        v-model="form.id"
        class="my-3"
        :definition="{
          type: 'string',
          title: `Enter ${spaceId} to continue`,
          minLength: 1
        }"
      />
      <UiCheckbox
        v-model="form.confirmed"
        :title="`I acknowledge that I will not be able to use ${spaceId} again to create a new space.`"
      />
    </div>
    <template #footer>
      <UiButton class="w-full" :disabled="!isValid" @click="handleSubmit">
        Confirm
      </UiButton>
    </template>
  </UiModal>
</template>
