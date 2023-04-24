<script setup lang="ts">
type Definition = {
  format: string;
  examples: string[];
};

const props = withDefaults(
  defineProps<{
    initialValue: string;
    editable: boolean;
    loading?: boolean;
    definition: Definition;
  }>(),
  { loading: false }
);

const emit = defineEmits<{
  (e: 'save', value: string);
}>();

const editing = ref(false);
const inputValue = ref(props.initialValue);

function handleSave() {
  emit('save', inputValue.value);
  editing.value = false;
}
</script>

<template>
  <div class="flex items-center gap-2 group w-fit" :class="{ 'mt-2': editing }">
    <UiLoading v-if="loading" />
    <template v-else>
      <SIString v-if="editing" v-model="inputValue" class="!mb-0" :definition="definition" />
      <slot v-else />
      <template v-if="editing">
        <button class="hover:opacity-80" @click="handleSave">
          <IH-check />
        </button>
        <button class="hover:opacity-80" @click="editing = !editing">
          <IH-x />
        </button>
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
