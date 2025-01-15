<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    steps: ReadonlyArray<{ id: string; title: string }>;
    validatePageFn: (pageId: string) => boolean | undefined;
    submitting?: boolean;
  }>(),
  {
    submitting: false
  }
);

const emit = defineEmits(['submit']);

const currentPage: Ref<string> = ref(props.steps[0].id);
const pagesRefs = ref([] as HTMLElement[]);
const pagesErrors: Ref<Record<string, Record<string, string>>> = ref(
  props.steps.reduce(
    (acc, page) => ({ ...acc, [page.id]: {} }),
    {} as Record<string, Record<string, string>>
  )
);

const accessiblePages = computed(() => {
  const invalidPageIndex = props.steps.findIndex(
    page => !validateStep(page.id)
  );

  return Object.fromEntries(
    props.steps.map((page, i) => [
      page.id,
      invalidPageIndex === -1 ? true : i <= invalidPageIndex
    ])
  );
});
const showCreate = computed(
  () =>
    props.steps.findIndex(page => page.id === currentPage.value) ===
    props.steps.length - 1
);
const nextDisabled = computed(() => !validateStep(currentPage.value));
const submitDisabled = computed(() =>
  props.steps.some(page => !validateStep(page.id))
);

function validateStep(pageId: string) {
  return (
    props.validatePageFn(pageId) ??
    Object.values(pagesErrors.value[pageId]).length === 0
  );
}

function handleErrors(pageId: string, errors: any) {
  pagesErrors.value[pageId] = errors;
}

function handleNextClick() {
  const currentIndex = props.steps.findIndex(
    page => page.id === currentPage.value
  );
  if (currentIndex === props.steps.length - 1) return;

  currentPage.value = props.steps[currentIndex + 1].id;
  pagesRefs.value[currentIndex + 1].scrollIntoView();
}
</script>

<template>
  <div class="pt-5 flex max-w-[50rem] mx-auto px-4">
    <div
      class="flex fixed lg:sticky top-[72px] inset-x-0 p-3 border-b z-10 bg-skin-bg lg:top-auto lg:inset-x-auto lg:p-0 lg:pr-5 lg:border-0 lg:flex-col gap-1 min-w-[180px] overflow-auto"
    >
      <button
        v-for="page in steps"
        ref="pagesRefs"
        :key="page.id"
        type="button"
        :disabled="!accessiblePages[page.id]"
        class="px-3 py-1 block lg:w-full rounded text-left scroll-mr-3 first:ml-auto last:mr-auto whitespace-nowrap"
        :class="{
          'bg-skin-active-bg': page.id === currentPage,
          'hover:bg-skin-hover-bg': page.id !== currentPage,
          'text-skin-link': accessiblePages[page.id]
        }"
        @click="currentPage = page.id"
      >
        {{ page.title }}
      </button>
    </div>
    <div class="flex-1">
      <div class="mt-8 lg:mt-0">
        <slot
          name="content"
          :current-page="currentPage"
          :handle-errors="handleErrors"
        />
      </div>
      <UiButton
        v-if="showCreate"
        class="w-full"
        :loading="submitting"
        :disabled="submitDisabled"
        @click="emit('submit')"
      >
        <slot name="submit-text"> Submit </slot>
      </UiButton>
      <UiButton
        v-else
        class="w-full"
        :disabled="nextDisabled"
        @click="handleNextClick"
      >
        Next
      </UiButton>
    </div>
  </div>
</template>
