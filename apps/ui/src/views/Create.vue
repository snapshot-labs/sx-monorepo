<script setup lang="ts">
type SpaceType = 'onchain' | 'offchain';

const { setTitle } = useTitle();

const spaceType = ref<SpaceType | null>(null);

setTitle('Create space');
</script>

<template>
  <div v-if="!spaceType" class="max-w-[50rem] mx-auto px-4 mt-4 space-y-4">
    <h2>Choose a space type</h2>
    <div class="flex w-full gap-3">
      <button
        class="border p-3 w-full rounded-md"
        @click="spaceType = 'onchain'"
      >
        Create an <b>onchain</b> space
      </button>
      <button
        class="border p-3 w-full rounded-md"
        @click="spaceType = 'offchain'"
      >
        Create an <b>offchain</b> space
      </button>
    </div>
  </div>
  <SpaceCreateOnchain v-else-if="spaceType === 'onchain'" />
  <SpaceCreateOffchain v-else />
</template>
