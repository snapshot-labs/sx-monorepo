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
        class="!h-[48px] flex items-center border rounded-full px-3.5 gap-2"
        :class="{ '!border-skin-link': selectedChoices[i + 1] > 0 }"
      >
        <div class="grow truncate">
          {{ choice }}
        </div>

        <UiButton
          :disabled="!selectedChoices[i + 1]"
          class="rounded-none border-y-0 shrink-0"
          @click="decreaseChoice(i + 1)"
        >
          -
        </UiButton>
        <UiInputNumber
          v-model.number="selectedChoices[i + 1]"
          :definition="{ examples: [0] }"
          min="0"
          class="w-[40px] !px-0 !m-0 text-right !rounded-none !border-0 shrink-0"
        />
        <UiButton class="rounded-none border-y-0 shrink-0" @click="increaseChoice(i + 1)">
          +
        </UiButton>
        <div class="w-[50px] text-right shrink-0">
          {{ _p(getChoiceWeight(selectedChoices, i)) }}
        </div>
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
