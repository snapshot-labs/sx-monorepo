<script setup lang="ts">
import { ensNormalize } from '@ethersproject/hash';
import { getValidator } from '@/helpers/validation';
import { NetworkID } from '@/types';

const DEFINITION = {
  type: 'object',
  title: 'ENS name',
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: {
      type: 'string',
      format: 'domain',
      title: 'Custom domain',
      minLength: 1,
      maxLength: 64,
      examples: ['vote.balancer.fi']
    }
  }
};

const props = defineProps<{
  open: boolean;
  account: string;
  networkId: NetworkID;
}>();

const emit = defineEmits<{
  (e: 'close');
  (e: 'attach', name: string);
}>();

const { attachCustomName } = useWalletEns(props.networkId);

const loading = ref(false);
const form = ref({
  name: ''
});
const domainValidationError = ref({});

const formErrors = computed(() => {
  domainValidationError.value = {};
  const validator = getValidator(DEFINITION);
  return validator.validate(form.value, { skipEmptyOptionalFields: true });
});

const canSubmit = computed(() => {
  return Object.keys(formErrors.value).length === 0;
});

async function handleSubmit() {
  if (!canSubmit.value) return;

  loading.value = true;

  try {
    form.value.name = ensNormalize(form.value.name);

    if (!(await attachCustomName(form.value.name))) {
      domainValidationError.value = {
        name: 'The given domain does not resolve to your address'
      };
      return;
    }

    emit('attach', form.value.name);
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  open => {
    if (!open) {
      form.value.name = '';
      domainValidationError.value = {};
    }
  }
);
</script>

<template>
  <UiModal :open="open" data-model="user-modal" @close="$emit('close')">
    <template #header>
      <h3>Attach custom domain</h3>
    </template>
    <div class="s-box p-4 space-y-3">
      <UiForm
        v-model="form"
        :definition="DEFINITION"
        :error="{ ...formErrors, ...domainValidationError }"
      />
    </div>
    <template #footer>
      <UiButton
        primary
        class="w-full"
        :loading="loading"
        :disabled="!canSubmit"
        @click="handleSubmit"
      >
        Attach domain
      </UiButton>
    </template>
  </UiModal>
</template>
