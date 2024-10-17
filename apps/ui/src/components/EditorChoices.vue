<script setup lang="ts">
import Draggable from 'vuedraggable';
import { Draft } from '@/types';

const proposal = defineModel<Draft>({ required: true });

const props = defineProps<{
  error?: string;
  definition: any;
}>();

const choices: Ref<any[]> = ref([]);
const showError = computed<boolean>(() => !!props.error);

function handleAddChoice() {
  proposal.value.choices.push('');
  nextTick(() => choices.value[proposal.value.choices.length - 1].focus());
}

function handlePressEnter(index: number) {
  if (!choices.value[index + 1]) return handleAddChoice();

  nextTick(() => choices.value[index + 1].focus());
}

function handlePressDelete(event: KeyboardEvent, index: number) {
  if (proposal.value.choices[index] === '') {
    event.preventDefault();

    if (index !== 0) {
      proposal.value.choices.splice(index, 1);
      nextTick(() => choices.value[index - 1].focus());
    }
  }
}
</script>

<template>
  <div
    class="s-base mb-5"
    :class="{
      's-error': showError
    }"
  >
    <h4 class="eyebrow mb-2.5">Choices</h4>
    <div class="flex flex-col">
      <Draggable
        v-model="proposal.choices"
        v-bind="{ animation: 200 }"
        handle=".handle"
        class="flex flex-col gap-2 mb-3"
        item-key="index"
      >
        <template #item="{ index }">
          <div>
            <div
              class="flex items-center rounded-lg bg-skin-border h-[40px] gap-2.5 pl-2.5"
            >
              <div
                v-if="proposal.type !== 'basic'"
                class="text-skin-text handle cursor-grab"
              >
                <IC-drag />
              </div>
              <div v-else class="mt-1.5">
                <div
                  class="shrink-0 rounded-full choice-bg inline-block size-[18px]"
                  :class="`_${index + 1}`"
                >
                  <IH-check
                    v-if="index === 0"
                    class="text-white size-[14px] mt-0.5 ml-0.5"
                  />
                  <IH-x
                    v-else-if="index === 1"
                    class="text-white size-[14px] mt-0.5 ml-0.5"
                  />
                  <IH-minus-sm
                    v-else-if="index === 2"
                    class="text-white size-[14px] mt-0.5 ml-0.5"
                  />
                </div>
              </div>
              <div class="grow">
                <input
                  :ref="el => (choices[index] = el)"
                  v-model.trim="proposal.choices[index]"
                  type="text"
                  :maxLength="definition.items[0].maxLength"
                  class="w-full h-[40px] py-[10px] bg-transparent text-skin-heading"
                  :placeholder="`Choice ${index + 1}`"
                  @keyup.enter="handlePressEnter(index)"
                  @keydown.delete="e => handlePressDelete(e, index)"
                />
              </div>
              <UiButton
                v-if="proposal.choices.length > 1 && proposal.type !== 'basic'"
                class="!border-0 !rounded-l-none !rounded-r-lg !bg-transparent !size-[40px] !px-0 !text-skin-text shrink-0"
                @click="proposal.choices.splice(index, 1)"
              >
                <IH-trash class="inline-block" />
              </UiButton>
            </div>
          </div>
        </template>
      </Draggable>
      <UiButton
        v-if="proposal.type !== 'basic'"
        class="w-full flex items-center justify-center space-x-1"
        @click="handleAddChoice"
      >
        <IH-plus-sm />
        <span>Add choice</span>
      </UiButton>
    </div>
    <div v-if="showError" class="s-input-error-message leading-6 mt-2">
      <span v-text="error" />
      <slot name="error-suffix" />
    </div>
  </div>
</template>
