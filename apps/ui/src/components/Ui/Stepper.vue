<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    steps: Record<string, { title: string; isValid: () => boolean }>;
    submitting?: boolean;
  }>(),
  {
    submitting: false
  }
);

const emit = defineEmits(['submit']);

const stepper = useStepper(props.steps);

const firstInvalidStepIndex = computed(() => {
  const index = Object.values(props.steps).findIndex(step => !step.isValid());

  return index >= 0 ? index : stepper.stepNames.value.length;
});

const submitDisabled = computed(() =>
  Object.values(props.steps).some(step => !step.isValid())
);

function goToStep(stepName: string) {
  stepper.goTo(stepName);
  window.scrollTo({
    top: 0
  });
}
</script>

<template>
  <div class="pt-5 flex max-w-[50rem] mx-auto px-4">
    <div
      class="flex fixed lg:sticky top-[72px] inset-x-0 p-3 border-b z-10 bg-skin-bg lg:top-auto lg:inset-x-auto lg:p-0 lg:pr-5 lg:border-0 lg:flex-col gap-1 min-w-[180px] overflow-auto"
    >
      <button
        v-for="(step, stepName, i) in steps"
        :key="stepName"
        type="button"
        :disabled="i > firstInvalidStepIndex"
        class="px-3 py-1 block lg:w-full rounded text-left scroll-mr-3 first:ml-auto last:mr-auto whitespace-nowrap"
        :class="{
          'bg-skin-active-bg': stepper.isCurrent(stepName),
          'hover:bg-skin-hover-bg': !stepper.isCurrent(stepName),
          'text-skin-link': i <= firstInvalidStepIndex
        }"
        @click="goToStep(stepName)"
      >
        {{ step.title }}
      </button>
    </div>
    <div class="flex-1">
      <div class="mt-8 lg:mt-0">
        <slot
          name="content"
          :current-step="stepper.stepNames.value[stepper.index.value]"
        />
      </div>
      <UiButton
        v-if="stepper.isLast.value"
        class="w-full"
        :loading="submitting"
        :disabled="submitDisabled"
        @click="emit('submit')"
      >
        <slot name="submit-text"> Submit </slot>
      </UiButton>
      <UiButton
        v-else-if="stepper.next.value"
        class="w-full"
        :disabled="!stepper.current.value.isValid()"
        @click="goToStep(stepper.next.value)"
      >
        Next
      </UiButton>
    </div>
  </div>
</template>
