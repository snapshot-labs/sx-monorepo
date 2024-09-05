<script setup lang="ts">
import ICAnnotation from '~icons/heroicons-solid/annotation';
import ISCheck from '~icons/heroicons-solid/check';
import ISLightningBolt from '~icons/heroicons-solid/lightning-bolt';
import ISPlay from '~icons/heroicons-solid/play';

const STEPS = [
  {
    title: 'Discuss',
    about:
      "Stay connected to your community's conversations with our Discourse integration. Access forum discussions directly within Snapshot, participate in debates and refine ideas before they become proposals.",
    icon: ICAnnotation
  },
  {
    title: 'Delegate',
    about:
      'Amplify your governance impact. Become a delegate or choose one to represent your interests. Track delegate performance, read their statements, and make informed decisions about voting power allocation.',
    icon: ISLightningBolt
  },
  {
    title: 'Vote',
    about:
      "Shape your DAO's future with ease. Cast votes on key proposals through our intuitive interface. Stay informed with AI summaries, analyze trends, and see real-time results – all in one place.",
    icon: ISCheck
  },
  {
    title: 'Execute',
    about:
      'Transform decisions into action. After a proposal passes, seamlessly implement changes on-chain. Create and review transaction batches, then execute with confidence.',
    icon: ISPlay
  }
];
</script>

<template>
  <div>
    <UiContainer class="!max-w-screen-lg">
      <h1 class="font-display max-w-[680px] py-9 !text-[44px]">
        A fully integrated suite to manage DAO governance.
      </h1>
    </UiContainer>
    <div class="border-y">
      <UiContainer class="!max-w-screen-lg !px-0">
        <div class="grid grid-cols-1 lg:grid-cols-2 text-md">
          <div
            v-for="(step, i) in STEPS"
            :key="i"
            class="border-b border-r-0 last:border-b-0 lg:border-r lg:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(n+3)]:border-b-0"
          >
            <div class="px-4 pt-5 pb-7">
              <div class="flex space-x-2.5">
                <component
                  :is="step.icon"
                  class="text-skin-link size-[24px] mb-4 inline-block"
                />
                <h2
                  class="mb-3 font-heading text-[22px] inline-block"
                  v-text="step.title"
                />
              </div>
              <div v-text="step.about" />
            </div>
          </div>
        </div>
      </UiContainer>
    </div>
  </div>
</template>
