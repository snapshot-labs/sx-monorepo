<script setup lang="ts">
import { validateForm } from '@/helpers/validation';

const props = defineProps<{
  open: boolean;
  initialState?: any;
  definition: any;
}>();

const emit = defineEmits<{
  (e: 'close');
  (e: 'save', value: Record<string, any>);
}>();

const showPicker = ref(false);
const pickerField: Ref<string | null> = ref(null);
const searchValue = ref('');
const form: Ref<Record<string, any>> = ref({});

const formErrors = computed(() =>
  validateForm(props.definition, form.value, { skipEmptyOptionalFields: true })
);

function handlePickerClick(field: string) {
  showPicker.value = true;
  pickerField.value = field;
}

function handlePickerSelect(value: string) {
  showPicker.value = false;

  if (!pickerField.value) return;

  form.value[pickerField.value] = value;
}

async function handleSubmit() {
  emit('save', form.value);
}

watch(
  () => props.open,
  () => {
    if (!props.initialState) return;

    form.value = props.initialState;
  }
);
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3>Edit strategy</h3>
      <template v-if="showPicker">
        <a class="absolute left-0 -top-1 p-4 text-color" @click="showPicker = false">
          <IH-arrow-narrow-left class="mr-2" />
        </a>
        <div class="flex items-center border-t px-2 py-3 mt-3 -mb-3">
          <IH-search class="mx-2" />
          <input
            ref="searchInput"
            v-model="searchValue"
            type="text"
            placeholder="Search"
            class="flex-auto bg-transparent text-skin-link"
          />
        </div>
      </template>
    </template>
    <BlockContactPicker
      v-if="showPicker"
      :loading="false"
      :search-value="searchValue"
      @pick="handlePickerSelect"
    />
    <div v-else class="s-box p-4">
      <SIObject
        v-model="form"
        :error="formErrors"
        :definition="definition"
        @pick="handlePickerClick"
      />
    </div>
    <template v-if="!showPicker" #footer>
      <UiButton class="w-full" :disabled="Object.keys(formErrors).length > 0" @click="handleSubmit">
        Confirm
      </UiButton>
    </template>
  </UiModal>
</template>
