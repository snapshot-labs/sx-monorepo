<script setup lang="ts">
const model = defineModel<string[]>({ required: true });

const props = defineProps<{
  definition: any;
}>();

const input = ref(model.value || props.definition.default || []);

watchImmediate(input, () => (model.value = input.value));

function addItem() {
  input.value.push('');
}
</script>

<template>
  <SBase :definition="definition">
    <div v-for="(item, i) in input" :key="i">
      <SString v-model="input[i]" :definition="{ title: '' }" />
    </div>
    <a @click="addItem">Add</a>
  </SBase>
</template>
