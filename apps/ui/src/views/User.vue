<script setup lang="ts">
import { useUsersStore } from '@/stores/users';
import { shortenAddress } from '@/helpers/utils';

const { networkId, address } = useRouteParser('id');
const usersStore = useUsersStore();

const user = computed(() => usersStore.getUser(address.value));

watch([networkId, address], () => usersStore.fetchUser(address.value, networkId.value), {
  immediate: true
});
</script>

<template>
  <UiLoading v-if="!user" class="block text-center p-4" />
  <div v-else>
    <div class="relative bg-skin-border h-[140px] -mb-[70px] top-[-1px]" />
    <Container slim>
      <div class="text-center mb-4 relative">
        <Stamp :id="user.id" :size="90" class="mb-2 border-[4px] border-skin-bg !bg-skin-border" />
        <h1>{{ shortenAddress(user.id) }}</h1>
        <div>
          <b class="text-skin-link">{{ user.proposal_count }}</b> proposals ·
          <b class="text-skin-link">{{ user.vote_count }}</b> votes
        </div>
      </div>
    </Container>
  </div>
</template>
