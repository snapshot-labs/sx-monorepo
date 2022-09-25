<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useUsersStore } from '@/stores/users';
import { shortenAddress } from '@/helpers/utils';

const route = useRoute();
const usersStore = useUsersStore();
const id = route.params.id as string;

onMounted(() => {
  usersStore.fetchUser(id);
});

const user = computed(() => usersStore.getUser(id));
</script>

<template>
  <UiLoading
    v-if="!usersStore.users[id]?.loaded"
    class="block text-center p-4"
  />
  <div v-else-if="user">
    <div class="relative bg-skin-border h-[140px] -mb-[70px]" />
    <Container slim>
      <div class="text-center mb-4 relative">
        <Stamp
          :id="id"
          :size="90"
          class="mb-2 border-[4px] border-skin-bg !bg-skin-bg"
        />
        <h1>{{ shortenAddress(id) }}</h1>
        <div>
          <b class="text-skin-link">{{ user.proposal_count }}</b> proposals ·
          <b class="text-skin-link">{{ user.vote_count }}</b> votes
        </div>
      </div>
    </Container>
  </div>
</template>
