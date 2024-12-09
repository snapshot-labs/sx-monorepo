<script setup lang="ts">
import { lsGet, lsSet } from '@/helpers/utils';

const KEY = 'showV2Welcome';

const open = ref(false);

function handleClose() {
  open.value = false;
  lsSet(KEY, false);
}

onMounted(async () => {
  open.value = lsGet(KEY) ?? true;
});
</script>

<template>
  <div
    v-if="open"
    class="fixed bottom-0 right-0 sm:mx-4 sm:mb-4 sm:rounded-lg bg-skin-link text-skin-bg z-[99] blocks-x !bg-left-top sm:max-w-[320px]"
  >
    <UiButton
      class="!text-skin-bg !bg-transparent !border-none absolute top-1 right-1 !px-0 w-[40px] !h-[40px]"
      @click="handleClose"
    >
      <IH-x class="inline-block" />
    </UiButton>
    <div class="bg-skin-link/90 sm:rounded-lg p-4">
      <div class="flex space-x-3">
        <div class="text-end">
          <img src="@/assets/snapshot.svg" alt="Snapshot" class="w-[36px]" />
        </div>
        <div class="font-bold text-md leading-5">
          Welcome to the new
          <div class="font-display text-xl">Snapshot</div>
        </div>
      </div>
      <div class="mt-3 mb-4">
        Introducing the next evolution of Snapshot, with a brand new interface,
        support for onchain voting, proposal executions, and many more
        governance enhancements.
      </div>
      <UiButton
        class="w-full"
        to="https://snapshot.mirror.xyz/0qnfjmE0SFeUykArdi664oO4qFcZUoZTTOd8m7es_Eo"
        >Learn more</UiButton
      >
    </div>
  </div>
</template>
