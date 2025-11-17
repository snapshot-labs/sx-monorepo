<script setup lang="ts" generic="T extends string | object">
import Draggable from 'vuedraggable';

const items = defineModel<T[]>();

const props = defineProps<{
  error?: Record<string, string> | string;
  definition: any;
  required?: boolean;
}>();

const itemsRef: Ref<any[]> = ref([]);
const isDirty = ref(false);

const itemType = computed<'string' | 'object'>(() => {
  return props.definition.items.type;
});

const defaultValue = computed<T>(() => {
  if (itemType.value === 'string') return '' as T;
  return {} as T;
});

const currentItems = computed<T[]>(
  () =>
    items.value || (props.definition.minItems > 0 ? [defaultValue.value] : [])
);

const inputValues = computed(() => {
  return currentItems.value.map((item, index) => ({
    get value() {
      return item;
    },
    set value(newValue: T) {
      const newItems = [...currentItems.value];
      newItems[index] = newValue;
      items.value = newItems;
      isDirty.value = true;
    }
  }));
});

const inputErrors = computed<Record<string, string>>(() => {
  return typeof props.error === 'string' ? {} : props.error || {};
});

const itemName = computed<string>(() => {
  return props.definition.items.title || 'Item';
});

function handleAddItem() {
  const newItems = [...currentItems.value, defaultValue.value];
  items.value = newItems;
  isDirty.value = true;

  nextTick(() => itemsRef.value[newItems.length - 1]?.focus());
}

function deleteItem(index: number) {
  const newItems = [...currentItems.value];
  newItems.splice(index, 1);
  items.value = newItems;
  isDirty.value = true;

  if (newItems.length === 0) return;

  nextTick(() => itemsRef.value[newItems.length - 1]?.focus());
}

function handlePressEnter(index: number) {
  if (
    props.definition.maxItems &&
    currentItems.value.length >= props.definition.maxItems
  ) {
    return;
  }

  const nextItem = itemsRef.value[index + 1];

  if (!nextItem) return handleAddItem();

  nextTick(() => nextItem.focus());
}

function handlePressDelete(index: number) {
  if (
    currentItems.value[index] !== '' ||
    currentItems.value.length <= (props.definition.minItems || 0) ||
    index === 0
  ) {
    return;
  }

  deleteItem(index);
  nextTick(() => itemsRef.value[index - 1].focus());
}

onMounted(() => {
  items.value ||= currentItems.value;
});
</script>

<template>
  <fieldset class="s-fieldset">
    <legend v-if="definition.title" class="flex justify-between items-center">
      <UiEyebrow class="font-medium"
        >{{ definition.title
        }}{{ definition.minItems > 0 ? '*' : '' }}</UiEyebrow
      >
      <UiTooltip v-if="definition.tooltip" :title="definition.tooltip">
        <IH-question-mark-circle class="shrink-0" />
      </UiTooltip>
    </legend>
    <slot name="empty-placeholder">
      <div
        v-if="currentItems.length < (definition.minItems || 0)"
        class="rounded-lg border border-skin-danger text-skin-danger px-3 py-1.5"
      >
        At least {{ definition.minItems }} {{ itemName.toLowerCase()
        }}{{ definition.minItems > 1 ? 's' : '' }}
        {{ definition.minItems > 1 ? 'are' : 'is' }} required.
      </div>
    </slot>
    <Draggable
      v-if="inputValues.length"
      v-model="items"
      v-bind="{ animation: 200 }"
      handle=".handle"
      class="s-fieldset-items"
      :item-key="(_: T, index: any) => index"
      :class="{
        'space-y-2': itemType === 'string',
        'space-y-2.5': itemType === 'object'
      }"
    >
      <template #item="{ index }">
        <div
          v-if="itemType === 'string'"
          class="s-base"
          :class="{
            's-error': inputErrors[index] && isDirty
          }"
        >
          <div class="s-input-wrapper">
            <IC-drag v-if="definition.sortable" class="handle cursor-grab" />
            <slot name="input-prefix" :index="index" />
            <input
              :ref="el => (itemsRef[index] = el)"
              v-model.trim="inputValues[index].value"
              type="text"
              :placeholder="
                definition.items?.examples?.[index] ||
                definition.items?.examples?.[0] ||
                ''
              "
              @keydown.enter="handlePressEnter(index)"
              @keydown.delete="handlePressDelete(index)"
            />
            <slot
              name="input-suffix"
              :index="index"
              :item-name="definition.items.title"
              :delete-item="deleteItem"
            >
              <button
                class="text-skin-text"
                :title="`Delete ${itemName.toLowerCase()}`"
                @click="deleteItem(index)"
              >
                <IH-trash />
              </button>
            </slot>
          </div>
          <div
            v-if="inputErrors[index] && isDirty"
            class="s-input-error-message"
            v-text="inputErrors[index]"
          />
        </div>
        <div v-else class="s-form-wrapper">
          <div class="flex items-center gap-2.5">
            <IC-drag v-if="definition.sortable" class="handle cursor-grab" />
            <slot name="input-prefix" :index="index" />
            <div
              class="flex-1 text-skin-link"
              v-text="`${itemName} #${index + 1}`"
            />
            <slot
              name="input-suffix"
              :index="index"
              :item-name="definition.items.title"
              :delete-item="deleteItem"
            >
              <button
                class="shrink-0 text-skin-text"
                :title="`Delete ${itemName.toLowerCase()}`"
                @click="deleteItem(index)"
              >
                <IH-trash />
              </button>
            </slot>
          </div>
          <UiForm
            v-model="inputValues[index].value"
            :definition="definition.items"
            :error="inputErrors[index]"
          >
          </UiForm>
        </div>
      </template>
    </Draggable>
    <UiButton
      v-if="!definition.maxItems || currentItems.length < definition.maxItems"
      class="w-full"
      @click="handleAddItem"
    >
      <IH-plus-sm />
      Add {{ itemName.toLowerCase() }}
    </UiButton>
    <slot name="suffix" />
  </fieldset>
</template>
