<script setup lang="ts">
import { _p, getChoiceWeight } from '@/helpers/utils';
import { Choice, Proposal } from '@/types';

defineProps<{
  sendingType: Choice | null;
  proposal: Proposal;
}>();

defineEmits<{
  (e: 'vote', value: Choice);
}>();

const selectedChoices = ref<Record<string, number>>({});

function increaseChoice(index: number) {
  selectedChoices.value[index] ||= 0;
  selectedChoices.value[index]++;
}

function decreaseChoice(index: number) {
  selectedChoices.value[index]--;

  if (selectedChoices.value[index] === 0) {
    delete selectedChoices.value[index];
  }
}

// Delete choice if empty string or 0
watch(
  () => selectedChoices.value,
  currentValue => {
    Object.entries(currentValue).forEach(([key, value]) => {
      if (value <= 0) {
        delete selectedChoices.value[key];
      }
    });
  },
  { immediate: true, deep: true }
);
</script>

<template>
  <div class="flex flex-col space-y-3">
    <div class="flex flex-col space-y-2">
      <div
        v-for="(choice, i) in proposal.choices"
        :key="i"
        class="!h-[48px] flex items-center border rounded-full px-3.5 pr-2.5 gap-2 relative overflow-hidden"
        :class="{
          '!border-skin-link': selectedChoices[i + 1] > 0
        }"
      >
        <div class="grow truncate text-skin-link">
          {{ choice }}
        </div>

        <div class="flex gap-1 items-center">
          <UiButton
            :disabled="!selectedChoices[i + 1]"
            class="rounded-full !p-0 !h-[28px] !w-[28px] text-sm shrink-0"
            @click.stop="decreaseChoice(i + 1)"
          >
            -
          </UiButton>
          <UiInputNumber
            v-model.number="selectedChoices[i + 1]"
            :definition="{ examples: [0] }"
            min="0"
            class="!w-[18px] !px-0 !m-0 text-center !rounded-none !border-0 shrink-0"
          />
          <UiButton
            class="rounded-full !p-0 !h-[28px] !w-[28px] text-sm shrink-0"
            @click.stop="increaseChoice(i + 1)"
          >
            +
          </UiButton>
        </div>
        <div
          class="top-0 left-0 bottom-0 absolute bg-skin-border opacity-40 -z-10"
          :style="{ width: _p(getChoiceWeight(selectedChoices, i)) }"
        ></div>
      </div>
    </div>
    <UiButton
      primary
      class="!h-[48px] w-full"
      :loading="!!sendingType"
      @click="$emit('vote', selectedChoices)"
    >
      Vote
    </UiButton>
  </div>
</template>
