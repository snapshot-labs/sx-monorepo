<script setup lang="ts">
import ICAnnotation from '~icons/heroicons-solid/annotation';
import ISCheck from '~icons/heroicons-solid/check';
import ISLightningBolt from '~icons/heroicons-solid/lightning-bolt';
import ISPlay from '~icons/heroicons-solid/play';

const STEPS = [
  {
    title: 'Discuss',
    about:
      'Follow your ongoing community discussions from within the Snapshot app.',
    icon: ICAnnotation
  },
  {
    title: 'Delegate',
    about: 'Become a delegate and get voting power from your peers.',
    icon: ISLightningBolt
  },
  {
    title: 'Vote',
    about:
      'Exercise your decision making power to shape the future of your DAO.',
    icon: ISCheck
  },
  {
    title: 'Execute',
    about: 'Execute transactions onchain once a proposal is passed.',
    icon: ISPlay
  }
];
</script>

<template>
  <div>
    <UiContainer class="!max-w-screen-lg">
      <h1 class="mono max-w-[680px] py-9 !text-[44px]">
        A fully integrated suite to manage DAO governance.
      </h1>
    </UiContainer>
    <div class="border-y">
      <UiContainer class="!max-w-screen-lg">
        <div class="grid grid-cols-1 lg:grid-cols-4 text-md -mx-4">
          <div
            v-for="(step, i) in STEPS"
            :key="i"
            class="border-b last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"
          >
            <div class="px-4 py-5">
              <component
                :is="step.icon"
                class="text-skin-link size-[24px] mb-4"
              />
              <h3 class="mb-2 disp text-[19px]" v-text="step.title" />
              <div v-text="step.about" />
            </div>
          </div>
        </div>
      </UiContainer>
    </div>
  </div>
</template>
