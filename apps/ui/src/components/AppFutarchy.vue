<script setup lang="ts">
import { Proposal } from '@/types';

defineProps<{ proposal: Proposal }>();
</script>

<template>
  <div>
    <h4 class="mb-2.5 eyebrow flex items-center gap-2">
      <img
        src="https://pbs.twimg.com/profile_images/1854253059095859212/AZPGrAaV_400x400.jpg"
        class="size-[20px]"
      />
      <span>Futarchy.fi</span>
    </h4>
    <div class="leading-6">
      <div class="mb-2.5">
        Predict how this proposal will impact GNO's price through prediction
        markets on Futarchy.fi.
        <a href="https://futarchy.fi" target="_blank">Learn more</a>.
      </div>
      <div class="mb-3 rounded-lg border px-3 py-2.5">
        <div class="flex justify-between">
          <span><b>GNO</b> price</span>
          <span class="text-skin-link">103.34 xDAI</span>
        </div>
        <div class="flex justify-between">
          <span class="flex items-center gap-2">
            <span class="bg-skin-success size-2.5 rounded-full inline-block" />
            <span>If approved</span>
          </span>
          <span class="text-skin-link"> 123.34 xDAI</span>
        </div>
        <div class="flex justify-between">
          <span class="flex items-center gap-2">
            <span class="bg-skin-danger size-2.5 rounded-full inline-block" />
            <span>If rejected</span>
          </span>
          <span class="text-skin-link"> 89.34 xDAI</span>
        </div>
      </div>
      <div>
        <UiButton class="flex items-center justify-center gap-2 w-full">
          <span>Trade on Futarchy.fi</span>
          <IH-arrow-sm-right class="-rotate-45" />
        </UiButton>
      </div>
    </div>
  </div>
</template>
