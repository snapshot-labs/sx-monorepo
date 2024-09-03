<script setup lang="ts">
const usersStore = useUsersStore();
const { web3 } = useWeb3();
const followedSpacesStore = useFollowedSpacesStore();

const user = computed(() => {
  if (!web3.value.authLoading && web3.value.account) {
    return usersStore.getUser(web3.value.account);
  } else {
    return null;
  }
});

const tasks = computed(() => ({
  profile: !user.value?.created,
  following: followedSpacesStore.followedSpacesIds.length < 3,
  votes: !user.value?.votesCount
}));

const hasPendingTasks = computed(() =>
  Object.values(tasks.value).includes(true)
);

onMounted(async () => {
  if (web3.value.account) await usersStore.fetchUser(web3.value.account, true);
});
</script>

<template>
  <div
    v-if="user && followedSpacesStore.followedSpacesLoaded && hasPendingTasks"
  >
    <UiLabel label="onboarding" sticky />
    <div v-if="tasks.profile" class="border-b mx-4 py-[14px] flex gap-x-2.5">
      <IS-flag class="text-skin-link mt-1 shrink-0" />
      <div class="grow">
        Setup your
        <router-link :to="{ name: 'user', params: { id: user.id } }">
          profile
        </router-link>
      </div>
    </div>

    <div v-if="tasks.following" class="border-b mx-4 py-[14px] flex gap-x-2.5">
      <div><IS-flag class="text-skin-link mt-1" /></div>
      <div class="grow">
        Check the
        <router-link :to="{ name: 'my-explore' }"> explore </router-link>
        page and follow at least 3 spaces.
        <div
          class="inline-block bg-skin-border text-skin-link text-[13px] rounded-full px-1.5 ml-1"
        >
          {{ followedSpacesStore.followedSpacesIds.length }}/3
        </div>
      </div>
    </div>

    <div v-if="tasks.votes" class="border-b mx-4 py-[14px] flex gap-x-2.5">
      <div><IS-flag class="text-skin-link mt-1" /></div>
      <div class="grow">Cast your first vote</div>
    </div>
  </div>
</template>
