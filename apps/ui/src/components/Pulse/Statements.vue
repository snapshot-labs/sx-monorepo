<template>
  <div>
    <div class="border rounded-md p-4 h-[220px] flex flex-col">
      <div class="text-lg text-skin-link flex-auto">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua.
      </div>
      <div class="items-end space-x-2 grid grid-cols-3">
        <UiButton class="!border-skin-success !text-skin-success space-x-1">
          <IH-check class="inline-block" />
          <span class="hidden sm:inline-block" v-text="'Agree'" />
        </UiButton>
        <UiButton class="!border-skin-danger !text-skin-danger space-x-1">
          <IH-x class="inline-block" />
          <span class="hidden sm:inline-block" v-text="'Disagree'" />
        </UiButton>
        <UiButton class="!border-skin-text !text-skin-text space-x-1">
          <IH-minus-sm class="inline-block" />
          <span class="hidden sm:inline-block" v-text="'Pass'" />
        </UiButton>
      </div>
    </div>
    <div class="mx-1">
      <div class="border border-t-0 rounded-b-md h-2" />
      <div class="mx-1">
        <div class="border border-t-0 rounded-b-md h-2" />
        <div class="mx-1">
          <div class="border border-t-0 rounded-b-md h-2" />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts"></script>
