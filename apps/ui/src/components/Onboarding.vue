<script setup lang="ts">
const usersStore = useUsersStore();
const { web3 } = useWeb3();
const followedSpacesStore = useFollowedSpacesStore();

const user = computed(() => usersStore.getUser(web3.value.account));

const tasks = computed(() => ({
  profile: !user.value?.created,
  following:
    followedSpacesStore.followedSpacesLoaded &&
    followedSpacesStore.followedSpacesIds.length < 3,
  votes: !user.value?.votesCount
}));

const pendingTasks = computed(() => Object.values(tasks.value).includes(true));
</script>

<template>
  <div v-if="user && pendingTasks">
    <UiLabel label="onboarding" sticky />
    <div v-if="tasks.profile" class="border-b mx-4 py-[14px] flex gap-x-2.5">
      <span>
        <IS-flag :width="20" :height="20" class="text-skin-link mt-1" />
      </span>
      <span class="grow">
        Setup your
        <router-link :to="{ name: 'user', params: { id: user.id } }">
          profile
        </router-link>
      </span>
    </div>

    <div v-if="tasks.following" class="border-b mx-4 py-[14px] flex gap-x-2.5">
      <span>
        <IS-flag :width="20" :height="20" class="text-skin-link mt-1" />
      </span>
      <span class="grow">
        Check the
        <router-link :to="{ name: 'my-explore' }"> explore </router-link>
        page and follow at least 3 spaces.
        <span
          class="inline-block bg-skin-border text-skin-link text-[13px] rounded-full px-1.5 ml-1"
        >
          {{ followedSpacesStore.followedSpacesIds.length }}/3
        </span>
      </span>
    </div>

    <div v-if="tasks.votes" class="border-b mx-4 py-[14px] flex gap-x-2.5">
      <span>
        <IS-flag width="20" :height="20" class="text-skin-link mt-1" />
      </span>
      <span class="grow">Cast your first vote</span>
    </div>
  </div>
</template>
