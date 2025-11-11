<script setup lang="ts">
import Draggable from 'vuedraggable';

const items = defineModel<string[]>();

const props = defineProps<{
  error?: Record<string, string> | string;
  definition: any;
  required?: boolean;
}>();

const itemsRef: Ref<any[]> = ref([]);

const currentItems = computed(() => items.value || ['']);

const inputValues = computed(() => {
  return currentItems.value.map((item, index) => ({
    get value() {
      return item;
    },
    set value(newValue: string) {
      const newItems = [...currentItems.value];
      newItems[index] = newValue;
      items.value = newItems;
    }
  }));
});

const inputErrors = computed<Record<string, string>>(() => {
  return typeof props.error === 'string' ? {} : props.error || {};
});

const itemName = computed<string>(() => {
  return props.definition.items.title?.toLowerCase() || '';
});

function handleAddItem() {
  const newItems = [...currentItems.value, ''];
  items.value = newItems;

  nextTick(() => itemsRef.value[newItems.length - 1].focus());
}

function deleteItem(index: number) {
  const newItems = [...currentItems.value];
  newItems.splice(index, 1);
  items.value = newItems;
}

function handlePressEnter(index: number) {
  if (
    props.definition.maxItems &&
    currentItems.value.length >= props.definition.maxItems
  )
    return;

  const nextItem = itemsRef.value[index + 1];

  if (!nextItem) return handleAddItem();

  nextTick(() => nextItem.focus());
}

function handlePressDelete(index: number) {
  if (items.value?.[index] !== '') return;

  if (currentItems.value.length > props.definition.minItems && index !== 0) {
    deleteItem(index);
    nextTick(() => itemsRef.value[index - 1].focus());
  }
}

onMounted(() => {
  items.value ||= [''];
});
</script>

<template>
  <div class="s-input-group">
    <div
      v-if="definition.title || definition.tooltip"
      class="s-input-group-title flex justify-between items-center"
    >
      <UiEyebrow>{{ definition.title }}{{ required ? '*' : '' }}</UiEyebrow>
      <UiTooltip v-if="definition.tooltip" :title="definition.tooltip">
        <IH-question-mark-circle class="shrink-0" />
      </UiTooltip>
    </div>
    <div class="space-y-3">
      <slot name="empty-placeholder">
        <div
          v-if="currentItems.length < (definition.minItems || 0)"
          class="rounded-lg border border-skin-danger text-skin-danger px-3 py-1.5"
        >
          At least {{ definition.minItems || 1 }} {{ itemName || 'item'
          }}{{ definition.minItems > 1 ? 's' : '' }}
          {{ definition.minItems > 1 ? 'are' : 'is' }} required.
        </div>
      </slot>
      <Draggable
        v-if="inputValues.length"
        v-model="items"
        v-bind="{ animation: 200 }"
        handle=".handle"
        item-key="index"
        class="s-input-group-items"
      >
        <template #item="{ index }">
          <div :class="{ 's-error': inputErrors[index] }">
            <div class="s-input">
              <IC-drag v-if="definition.sortable" class="handle cursor-grab" />
              <slot name="input-prefix" :index="index" />
              <input
                :ref="el => (itemsRef[index] = el)"
                v-model.trim="inputValues[index].value"
                type="text"
                class="h-[40px] py-[10px] bg-transparent text-skin-heading"
                :placeholder="
                  definition.items?.examples?.[index] ||
                  definition.items?.examples?.[0] ||
                  ''
                "
                @keyup.enter="handlePressEnter(index)"
                @keydown.delete="handlePressDelete(index)"
              />
              <slot
                name="input-suffix"
                :index="index"
                :item-name="itemName"
                :delete-item="deleteItem"
              >
                <button
                  class="text-skin-text"
                  :title="`Delete ${itemName}`.trim()"
                  @click="deleteItem(index)"
                >
                  <IH-trash />
                </button>
              </slot>
            </div>
            <span
              v-if="inputErrors[index]"
              class="s-input-error-message"
              v-text="inputErrors[index]"
            />
          </div>
        </template>
      </Draggable>
      <UiButton
        v-if="!definition.maxItems || currentItems.length < definition.maxItems"
        class="w-full"
        @click="handleAddItem"
      >
        <IH-plus-sm />
        Add {{ itemName }}
      </UiButton>
      <slot name="suffix" />
    </div>
  </div>
</template>
