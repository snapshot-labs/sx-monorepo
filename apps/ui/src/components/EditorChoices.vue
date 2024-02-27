<script setup lang="ts">
import Draggable from 'vuedraggable';
import { Draft, VoteType } from '@/types';

const proposal = defineModel<Draft>({ required: true });

defineProps<{
  votingTypes: VoteType[];
  definition: any;
}>();
</script>

<template>
  <div v-if="votingTypes.length > 1 || votingTypes[0] !== 'basic'" class="s-base mb-5">
    <h4 class="eyebrow mb-2.5">Choices</h4>
    <div class="flex flex-col gap-[10px]">
      <Draggable
        v-model="proposal.choices"
        v-bind="{ animation: 200 }"
        handle=".handle"
        class="flex flex-col gap-[10px]"
        item-key="index"
      >
        <template #item="{ index }">
          <div>
            <div class="flex items-center rounded-lg bg-skin-border h-[40px] gap-[12px] pl-2.5">
              <div v-if="proposal.type !== 'basic'" class="text-skin-text handle cursor-grab">
                <IC-drag />
              </div>
              <div class="grow">
                <input
                  v-model.trim="proposal.choices[index]"
                  type="text"
                  :maxLength="definition.items[0].maxLength"
                  class="w-full h-[40px] py-[10px] bg-transparent text-skin-heading"
                  :class="{
                    '!cursor-not-allowed': proposal.type === 'basic'
                  }"
                  :placeholder="`Choice ${index + 1}`"
                  :disabled="proposal.type === 'basic'"
                />
              </div>
              <UiButton
                v-if="proposal.choices.length > 1 && proposal.type !== 'basic'"
                class="border-0 rounded-l-none rounded-r-lg bg-transparent !h-[40px] w-[40px] !px-0 text-center text-skin-text shrink-0"
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
        class="w-full border-dashed rounded-lg flex items-center justify-center space-x-1 !h-[40px]"
        @click="proposal.choices.push('')"
      >
        <IH-plus-sm />
        <span>New choice</span>
      </UiButton>
    </div>
  </div>
</template>
