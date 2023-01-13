<script setup lang="ts">
const state: 'WAITING' | 'FINALIZED' | 'RECEIVED' | 'EXECUTED' = 'WAITING';
</script>

<template>
  <div class="x-block !border-x rounded-lg p-3">
    <UiButton
      :disabled="state !== 'WAITING'"
      class="block mb-2 w-full flex justify-center items-center"
    >
      <IH-check-circle class="inline-block mr-2" />
      Finalize proposal
    </UiButton>
    <UiButton
      :disabled="state !== 'FINALIZED'"
      class="block mb-2 w-full flex justify-center items-center"
    >
      <IH-database class="inline-block mr-2" />
      Receive proposal
    </UiButton>
    <UiButton
      :disabled="state !== 'RECEIVED'"
      class="block mb-2 w-full flex justify-center items-center"
    >
      <IH-play class="inline-block mr-2" />
      Execute transactions
    </UiButton>
  </div>
</template>
