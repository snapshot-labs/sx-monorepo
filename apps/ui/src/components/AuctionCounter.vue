<script setup lang="ts">
defineProps<{
  title: string;
  amount: string;
  subamount: string;
  symbol: string;
}>();
</script>

<template>
  <div class="flex flex-col">
    <span class="text-sm font-medium tracking-wider uppercase">
      {{ title }}
    </span>
    <div class="flex gap-1 items-baseline font-medium text-skin-link leading-9">
      <span class="text-[32px]">
        {{ amount }}
      </span>
      <span class="text-md">
        {{ symbol }}
      </span>
    </div>
    <span class="text-sm font-medium -mt-2">{{ subamount }}</span>
  </div>
</template>
