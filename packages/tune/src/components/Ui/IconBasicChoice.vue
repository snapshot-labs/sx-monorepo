<script lang="ts" setup>
defineProps<{
  choiceIndex: number;
}>();
</script>
<template>
  <div
    class="text-white rounded-full choice-bg inline-flex items-center justify-center size-[18px]"
    :class="`_${choiceIndex + 1}`"
  >
    <IH-check v-if="choiceIndex === 0" class="size-[14px]" />
    <IH-x v-else-if="choiceIndex === 1" class="size-[14px]" />
    <IH-minus-sm v-else-if="choiceIndex === 2" class="size-[14px]" />
  </div>
</template>
