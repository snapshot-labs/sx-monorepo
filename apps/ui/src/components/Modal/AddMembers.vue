<script setup lang="ts">
import { clone, uniqBy } from '@/helpers/utils';
import { validateForm } from '@/helpers/validation';
import { Member } from '@/types';

const DEFAULT_FORM_STATE = {
  addresses: '',
  role: 'author'
} as const;

const props = defineProps<{
  open: boolean;
  currentMembers: Member[];
}>();

const emit = defineEmits<{
  (e: 'add', value: Member[]): void;
  (e: 'close');
}>();

const definition = {
  type: 'object',
  title: 'AddMembers',
  additionalProperties: false,
  required: ['addresses', 'role'],
  properties: {
    addresses: {
      type: 'string',
      title: 'Addresses',
      format: 'address[]',
      minLength: 1,
      examples: [
        '0x3901D0fDe202aF1427216b79f5243f8A022d68cf, 0x3901D0fDe202aF1427216b79f5243f8A022d68cf'
      ]
    },
    role: {
      type: ['string'],
      enum: ['admin', 'moderator', 'author'],
      options: [
        {
          id: 'admin',
          name: 'Admin'
        },
        {
          id: 'moderator',
          name: 'Moderator'
        },
        {
          id: 'author',
          name: 'Author'
        }
      ],
      title: 'Role'
    }
  }
};

const form: Ref<{
  addresses: string;
  role: Member['role'];
}> = ref(clone(DEFAULT_FORM_STATE));

const uniqueAddresses = computed(() =>
  uniqBy(form.value.addresses.split(','), (address: string) =>
    address.trim().toLocaleLowerCase()
  )
);

const formErrors = computed(() => {
  const errors = validateForm(definition, form.value);

  const existingAddresses = new Map(
    props.currentMembers.map(member => [
      member.address.toLocaleLowerCase(),
      true
    ])
  );

  if (
    uniqueAddresses.value.some(address =>
      existingAddresses.has(address.toLocaleLowerCase())
    )
  ) {
    errors.addresses = 'Member already exists';
  }

  return errors;
});

function handleSubmit() {
  const members = uniqueAddresses.value.map(address => ({
    address,
    role: form.value.role
  }));

  emit('add', members);
  emit('close');
}

watch(
  () => props.open,
  open => {
    if (open) {
      form.value = clone(DEFAULT_FORM_STATE);
    }
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3>Add members</h3>
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
        class="w-full"
        :disabled="Object.keys(formErrors).length > 0"
        @click="handleSubmit"
      >
        Add
      </UiButton>
    </template>
  </UiModal>
</template>
