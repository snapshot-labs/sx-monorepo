<script lang="ts" setup>
export type StepRecords = Record<string, Step>;
type Step = {
  title: string;
  isValid: () => boolean;
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
  stepper.goTo(stepName);
  window.scrollTo({
    top: 0
  });
}
</script>

<template>
  <div class="flex flex-col lg:flex-row lg:items-start">
    <div class="absolute inset-x-0 lg:static">
      <div
        class="flex p-3 border-b bg-skin-bg lg:p-0 lg:border-0 lg:flex-col gap-1 min-w-[180px] overflow-x-auto"
      >
        <button
          v-for="(step, stepName) in steps"
          :key="stepName"
          type="button"
          class="px-3 py-1 flex items-center gap-2 text-skin-link rounded whitespace-nowrap hover:bg-skin-hover-bg"
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
    </div>
    <div class="flex-1 space-y-4 mt-[72px] lg:mt-0 pt-4 lg:pt-0">
      <slot
        name="content"
        :current-step="currentStep"
        :go-to-next="stepper.goToNext"
      />
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
