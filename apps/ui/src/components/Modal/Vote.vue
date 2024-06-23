<script setup lang="ts">
import { getChoiceText } from '@/helpers/utils';
import type { Choice, Proposal } from '@/types';

const props = defineProps<{
  proposal: Proposal;
  choice: Choice;
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close');
  (e: 'voted');
}>();

const { vote } = useActions();

const loading = ref(false);

async function handleSubmit() {
  loading.value = true;

  try {
    await vote(props.proposal, props.choice);
    emit('voted');
  } finally {
    loading.value = false;
    emit('close');
  }
}
</script>

<template>
  <UiModal :open="open" data-model="user-modal" @close="$emit('close')">
    <template #header>
      <h3>Cast your vote</h3>
    </template>

    <div class="m-4 flex flex-col space-y-3">
      <dl>
        <dt class="text-sm leading-5">Choice</dt>
        <dd
          class="font-semibold text-skin-heading text-[20px] leading-6"
          v-text="getChoiceText(proposal.choices, choice)"
        />
      </dl>
      <dl>
        <dt class="text-sm leading-5">Voting power</dt>
        <dd class="font-semibold text-skin-heading text-[20px] leading-6" v-text="'--'" />
      </dl>
    </div>

    <template #footer>
      <div class="flex space-x-3">
        <UiButton class="w-full" @click="$emit('close')"> Cancel </UiButton>
        <UiButton
          primary
          class="w-full"
          :disabled="!choice"
          :loading="loading"
          @click="handleSubmit"
        >
          Confirm
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
