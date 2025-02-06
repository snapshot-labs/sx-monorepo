<script setup lang="ts">
import { VERIFIED_URL } from '@/helpers/constants';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { isController, isAdmin } = useSpaceSettings(toRef(props, 'space'));

const canSeeOnboarding = computed(() => {
  return isController.value || isAdmin.value;
});

const tasks = computed(() => ({
  followers:
    props.space.additionalRawData?.type === 'offchain' &&
    (props.space.follower_count || 0) < 5,
  proposals: props.space.proposal_count === 0,
  votes: props.space.vote_count < 10,
  verified: !props.space.verified,
  treasuries: props.space.treasuries.length === 0
}));

const hasPendingTasks = computed(() =>
  Object.values(tasks.value).includes(true)
);
</script>

<template>
  <div v-if="canSeeOnboarding && hasPendingTasks">
    <UiLabel label="onboarding" sticky />
    <div v-if="tasks.followers" class="border-b mx-4 py-[14px] flex gap-x-2.5">
      <IS-flag class="text-skin-link mt-1 shrink-0" />
      <div class="grow">
        Share your space and get 5 followers.
        <div
          class="inline-block bg-skin-border text-skin-link text-[13px] rounded-full px-1.5 ml-1"
        >
          {{ space.follower_count || 0 }}/5
        </div>
      </div>
    </div>
    <div v-if="tasks.proposals" class="border-b mx-4 py-[14px] flex gap-x-2.5">
      <IS-flag class="text-skin-link mt-1" />
      <div class="grow">Publish your first proposal.</div>
    </div>
    <div v-if="tasks.votes" class="border-b mx-4 py-[14px] flex gap-x-2.5">
      <IS-flag class="text-skin-link mt-1 shrink-0" />
      <div class="grow">
        Get your first 10 votes.
        <div
          class="inline-block bg-skin-border text-skin-link text-[13px] rounded-full px-1.5 ml-1"
        >
          {{ space.vote_count }}/10
        </div>
      </div>
    </div>
    <div v-if="tasks.verified" class="border-b mx-4 py-[14px] flex gap-x-2.5">
      <IS-flag class="text-skin-link mt-1" />
      <div class="grow">
        Get your space
        <a
          :href="VERIFIED_URL"
          target="_blank"
          class="text-rose-500 dark:text-neutral-100 font-semibold"
          >verified</a
        >.
      </div>
    </div>
    <div v-if="tasks.treasuries" class="border-b mx-4 py-[14px] flex gap-x-2.5">
      <IS-flag class="text-skin-link mt-1" />
      <div class="grow">Add a treasury.</div>
    </div>
    <div class="mx-4 py-[10px] mb-4 flex gap-x-1.5 text-sm">
      <IH-eye class="text-skin-link mt-[3px]" /> Only you can see this.
    </div>
  </div>
</template>
