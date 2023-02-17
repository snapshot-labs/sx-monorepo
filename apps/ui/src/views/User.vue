<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useUsersStore } from '@/stores/users';
import { shortenAddress } from '@/helpers/utils';
import type { NetworkID } from '@/types';

const route = useRoute();
const usersStore = useUsersStore();
const id = route.params.id as string;
const [networkId, userId] = id.split(':');

onMounted(() => {
  usersStore.fetchUser(userId, networkId as NetworkID);
});

const user = computed(() => {
  return usersStore.getUser(userId);
});
</script>

<template>
  <UiLoading v-if="!usersStore.users[userId]?.loaded" class="block text-center p-4" />
  <div v-else-if="user">
    <div class="relative bg-skin-border h-[140px] -mb-[70px]" />
    <Container slim>
      <div class="text-center mb-4 relative">
        <Stamp :id="userId" :size="90" class="mb-2 border-[4px] border-skin-bg !bg-skin-border" />
        <h1>{{ shortenAddress(userId) }}</h1>
        <div>
          <b class="text-skin-link">{{ user.proposal_count }}</b> proposals ·
          <b class="text-skin-link">{{ user.vote_count }}</b> votes
        </div>
      </div>
    </Container>
  </div>
</template>
