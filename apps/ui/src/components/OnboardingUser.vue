<script setup lang="ts">
import { lsGet, lsSet } from '@/helpers/utils';

const usersStore = useUsersStore();
const { web3 } = useWeb3();
const followedSpacesStore = useFollowedSpacesStore();

const user = computed(() => {
  if (
    !web3.value.authLoading &&
    web3.value.account &&
    followedSpacesStore.followedSpacesLoaded
  ) {
    return usersStore.getUser(web3.value.account);
  } else {
    return null;
  }
});

const tasks = computed(() => ({
  profile: {
    pending: !user.value?.created,
    description: 'Setup your profile',
    link: { name: 'user', params: { user: user.value?.id } }
  },
  following: {
    pending: followedSpacesStore.followedSpacesIds.length < 3,
    currentStep: followedSpacesStore.followedSpacesIds.length,
    totalSteps: 3,
    description: 'Follow at least 3 spaces',
    link: { name: 'my-explore' }
  },
  votes: {
    pending: !user.value?.votesCount,
    description: 'Cast your first vote',
    link: {
      name: 'space-proposal-overview',
      params: {
        space: 's:pistachiodao.eth',
        proposal:
          '0x38c654c0f81b63ea1839ec3b221fad6ecba474aa0c4e8b4e8bc957f70100e753'
      }
    }
  }
}));

const pendingTasks = computed(() =>
  Object.entries(tasks.value).filter(([, task]) => task.pending)
);

watch(
  pendingTasks,
  value => {
    lsSet('showOnboarding', {
      ...lsGet('showOnboarding'),
      [web3.value.account]: !value.length ? false : undefined
    });
  },
  { immediate: true }
);

onMounted(async () => {
  const pending = lsGet('showOnboarding')?.[web3.value.account] ?? true;
  if (pending && web3.value.account)
    await usersStore.fetchUser(web3.value.account, true);
});
</script>

<template>
  <div v-if="user && pendingTasks.length">
    <UiLabel label="onboarding" sticky />
    <OnboardingTask
      v-for="[key, task] in pendingTasks"
      :key="key"
      :task="task"
    />
  </div>
</template>
