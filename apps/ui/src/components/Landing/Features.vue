<script setup lang="ts">
const FEATURES = [
  {
    title: 'Voting strategies',
    about:
      'Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.'
  },
  {
    title: 'Voting systems',
    about:
      'Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.'
  },
  {
    title: 'Discourse integration',
    about:
      'Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.'
  },
  {
    title: 'Proposal validation',
    about:
      'Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.'
  },
  {
    title: 'Whitelabel',
    about:
      'Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.'
  },
  {
    title: 'Optimistic quorum',
    about:
      'Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.'
  },
  {
    title: 'Draft system',
    about:
      'Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.'
  },
  {
    title: 'Delegates dashboard',
    about:
      'Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.'
  },
  {
    title: 'Leaderboard',
    about:
      'Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.'
  },
  {
    title: 'Shielded voting',
    about:
      'Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.'
  },
  {
    title: 'Gasless voting',
    about:
      'Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.'
  },
  {
    title: 'oSnap execution',
    about:
      'Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.'
  },
  {
    title: 'AI proposal summary',
    about:
      'Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.'
  },
  {
    title: 'Labels for proposals',
    about:
      'Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.'
  },
  {
    title: 'Organization view',
    about:
      'Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.'
  }
];
</script>

<template>
  <div class="py-8 border-b">
    <UiContainer class="!max-w-[1040px]">
      <div class="text-center pb-6 max-w-[600px] mx-auto">
        <div class="eyebrow mb-3">Features</div>
        <h1 class="mb-4 mono !text-[44px]">
          Everything DAOs needs to make better decisions together
        </h1>
      </div>
      <div class="grid grid-cols-3 gap-4 text-md">
        <div v-for="(feature, i) in FEATURES" :key="i">
          <h3 class="flex justify-center">
            <IH-adjustments class="w-[32px] h-[32px] mr-2.5" />
            {{ feature.title }}
          </h3>
        </div>
      </div>
    </UiContainer>
  </div>
</template>
