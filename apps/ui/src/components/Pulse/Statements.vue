<script setup lang="ts">
defineProps<{ statements: any[] }>();

const { sendVote } = usePulse();

const loading = ref(false);

async function handleVote(
  discussion: number,
  statement: number,
  choice: 1 | 2 | 3
) {
  loading.value = true;

  await sendVote(discussion, statement, choice);

  loading.value = false;
}
</script>

<template>
  <div v-if="statements[0]">
    <div class="border rounded-md p-4 h-[220px] flex flex-col">
      <div class="text-lg text-skin-link flex-auto">
        {{ statements[0].body }}
      </div>
      <div class="items-end space-x-2 grid grid-cols-3">
        <UiButton
          :disabled="loading"
          class="!border-skin-success !text-skin-success space-x-1"
          @click="handleVote(statements[0].discussion, statements[0].id, 1)"
        >
          <IH-check class="inline-block" />
          <span class="hidden sm:inline-block" v-text="'Agree'" />
        </UiButton>
        <UiButton
          :disabled="loading"
          class="!border-skin-danger !text-skin-danger space-x-1"
          @click="handleVote(statements[0].discussion, statements[0].id, 2)"
        >
          <IH-x class="inline-block" />
          <span class="hidden sm:inline-block" v-text="'Disagree'" />
        </UiButton>
        <UiButton
          :disabled="loading"
          class="!border-skin-text !text-skin-text space-x-1"
          @click="handleVote(statements[0].discussion, statements[0].id, 3)"
        >
          <IH-minus-sm class="inline-block" />
          <span class="hidden sm:inline-block" v-text="'Pass'" />
        </UiButton>
      </div>
    </div>
    <div v-if="statements[1]" class="mx-1">
      <div class="border border-t-0 rounded-b-md h-2" />
      <div v-if="statements[2]" class="mx-1">
        <div class="border border-t-0 rounded-b-md h-2" />
        <div v-if="statements[3]" class="mx-1">
          <div class="border border-t-0 rounded-b-md h-2" />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts"></script>
