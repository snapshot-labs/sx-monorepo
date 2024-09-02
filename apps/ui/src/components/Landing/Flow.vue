<script setup lang="ts">
const STEPS = [
  {
    title: 'Discuss',
    about:
      'Follow your ongoing community discussions from within the Snapshot app.'
  },
  {
    title: 'Delegate',
    about: 'Become a delegate and get voting power from your peers.'
  },
  {
    title: 'Vote',
    about:
      'Exercise your decision making power to shape the future of your DAO.'
  },
  {
    title: 'Execute',
    about: 'Execute transactions onchain once a proposal is passed.'
  }
];
</script>

<template>
  <div>
    <UiContainer class="!max-w-[1060px]">
      <h1 class="mono max-w-[680px] py-8">
        A fully integrated suite to manage DAO governance.
      </h1>
    </UiContainer>

    <div class="border-y">
      <UiContainer class="!max-w-[1060px]">
        <div class="grid grid-cols-4 text-md -mx-4">
          <div
            v-for="(step, i) in STEPS"
            :key="i"
            class="border-r last:border-0"
          >
            <div class="px-4 py-5">
              <h3
                class="mb-2 inline-block disp text-[19px]"
                v-text="step.title"
              />
              <div v-text="step.about" />
            </div>
          </div>
        </div>
      </UiContainer>
    </div>
  </div>
</template>
