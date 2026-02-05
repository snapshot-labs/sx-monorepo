<script setup lang="ts">
import { VERIFIED_URL } from '@/helpers/constants';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { isController, isAdmin } = useSpaceSettings(toRef(props, 'space'));

const canSeeOnboarding = computed(() => {
  return isController.value || isAdmin.value;
});

const tasks = computed(() => ({
  followers: {
    pending:
      props.space.additionalRawData?.type === 'offchain' &&
      (props.space.follower_count || 0) < 5,
    currentStep: props.space.follower_count || 0,
    totalSteps: 5,
    description: 'Share your space and get 5 followers'
  },
  proposals: {
    pending: props.space.proposal_count === 0,
    description: 'Publish your first proposal',
    link: { name: 'space-editor' }
  },
  votes: {
    pending: props.space.vote_count < 10,
    currentStep: props.space.vote_count,
    totalSteps: 10,
    description: 'Get your first 10 votes'
  },
  treasuries: {
    pending: props.space.treasuries.length === 0,
    description: 'Add a treasury',
    link: { name: 'space-settings', params: { tab: 'treasuries' } }
  },
  verified: {
    pending: !props.space.verified,
    description: 'Get your space verified',
    link: VERIFIED_URL
  }
}));

const pendingTasks = computed(() =>
  Object.entries(tasks.value).filter(([, task]) => task.pending)
);
</script>

<template>
  <div v-if="canSeeOnboarding && pendingTasks.length">
    <UiSectionHeader label="Onboarding" sticky />
    <OnboardingTask
      v-for="[key, task] in pendingTasks"
      :key="key"
      :task="task"
    />
    <div class="mx-4 py-[10px] mb-4 flex gap-x-1.5 text-sm">
      <IH-eye class="mt-[3px]" /> Only admins can see this
    </div>
  </div>
</template>
