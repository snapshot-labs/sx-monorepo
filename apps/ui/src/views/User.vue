<script setup lang="ts">
import { useUsersStore } from '@/stores/users';
import { shortenAddress, _n } from '@/helpers/utils';

const { setTitle } = useTitle();
const { networkId, address } = useRouteParser('id');
const usersStore = useUsersStore();

const user = computed(() => (address.value ? usersStore.getUser(address.value) : null));

watch(
  [networkId, address],
  () => {
    if (!address.value || !networkId.value) return;

    usersStore.fetchUser(address.value, networkId.value);
  },
  {
    immediate: true
  }
);

watchEffect(() => {
  setTitle(`${address.value} user profile`);
});
</script>

<template>
  <UiLoading v-if="!user" class="block text-center p-4" />
  <div v-else>
    <div class="relative h-[156px] md:h-[140px] -mb-[86px] md:-mb-[70px]">
      <div class="bg-skin-border h-full top-[-1px]" />
      <div class="relative bg-skin-bg h-[16px] top-[-16px] rounded-t-[16px] md:hidden" />
    </div>
    <Container slim>
      <div class="text-center mb-4 relative">
        <Stamp :id="user.id" :size="90" class="mb-2 border-[4px] border-skin-bg !bg-skin-border" />
        <h1>{{ shortenAddress(user.id) }}</h1>
        <div>
          <b class="text-skin-link">{{ _n(user.proposal_count) }}</b> proposals ·
          <b class="text-skin-link">{{ _n(user.vote_count) }}</b> votes
        </div>
      </div>
    </Container>
  </div>
</template>
