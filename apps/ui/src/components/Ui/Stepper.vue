<script lang="ts" setup>
export type StepRecords = Record<string, Step>;
type Step = {
  title: string;
  isValid: () => boolean;
  onBeforeQuit?: () => boolean;
};

const props = withDefaults(
  defineProps<{
    steps: StepRecords;
    submitting?: boolean;
  }>(),
  {
    submitting: false
  }
);

const emit = defineEmits<{
  (e: 'submit');
}>();

const stepper = useStepper(props.steps);

const submitDisabled = computed(() =>
  Object.values(props.steps).some(step => !step.isValid())
);

const currentStep = computed(() => {
  return stepper.stepNames.value[stepper.index.value];
});

function goToStep(stepName: string) {
  if (props.steps[currentStep.value]?.onBeforeQuit?.() === false) return;

  stepper.goTo(stepName);
  window.scrollTo({
    top: 0
  });
}
</script>

<template>
  <div class="flex">
    <div
      class="flex fixed lg:sticky top-[72px] inset-x-0 p-3 border-b z-10 bg-skin-bg lg:top-auto lg:inset-x-auto lg:p-0 lg:pr-5 lg:border-0 lg:flex-col gap-1 min-w-[180px] overflow-auto"
    >
      <button
        v-for="(step, stepName) in steps"
        :key="stepName"
        type="button"
        class="px-3 py-1 flex items-center gap-2 lg:w-full text-skin-link rounded text-left scroll-mr-3 first:ml-auto last:mr-auto whitespace-nowrap hover:bg-skin-hover-bg"
        :class="{
          'bg-skin-active-bg': stepper.isCurrent(stepName)
        }"
        @click="goToStep(stepName)"
      >
        <IH-check v-if="!step.isValid()" :class="'opacity-20'" />
        <IS-check v-if="step.isValid()" class="text-skin-success" />
        {{ step.title }}
      </button>
    </div>
    <div class="flex-1">
      <div class="mt-8 lg:mt-0">
        <slot
          name="content"
          :current-step="currentStep"
          :go-to-next="stepper.goToNext"
        />
      </div>
      <UiButton
        v-if="stepper.isLast.value"
        class="w-full primary"
        :loading="submitting"
        :disabled="submitDisabled"
        @click="emit('submit')"
      >
        <slot name="submit-text"> Submit </slot>
      </UiButton>
      <UiButton
        v-else-if="stepper.next.value"
        class="w-full primary"
        :disabled="!stepper.current.value.isValid()"
        @click="goToStep(stepper.next.value)"
      >
        Next
      </UiButton>
    </div>
  </div>
</template>
