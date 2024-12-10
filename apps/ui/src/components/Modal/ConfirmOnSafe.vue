<script setup lang="ts">
type Messages = {
  title: string;
  subtitle?: string;
};

withDefaults(
  defineProps<{
    open: boolean;
    messages: Messages;
    showVerifierLink?: boolean;
    showIcon?: boolean;
  }>(),
  {
    showIcon: true,
    showVerifierLink: false
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <UiModal :open="open" class="text-skin-heading" @close="emit('close')">
    <div
      class="flex flex-col space-y-3 px-4 py-5 text-center items-center text-skin-text"
    >
      <div class="bg-skin-text rounded-full p-[12px]">
        <IS-check :width="28" :height="28" class="text-skin-bg" />
      </div>

      <div class="flex flex-col space-y-1 leading-6">
        <h4
          class="font-semibold text-skin-heading text-lg"
          v-text="messages.title"
        />
        <div v-if="messages.subtitle" v-text="messages.subtitle" />
      </div>

      <div v-if="showVerifierLink" class="pt-2">
        You can use
        <AppLink
          to="https://github.com/snapshot-labs/hash-verifier"
          class="inline-flex items-center"
        >
          hash-verifier <IH-arrow-sm-right class="inline-block -rotate-45" />
        </AppLink>
        to validate the data.
      </div>
    </div>
  </UiModal>
</template>
