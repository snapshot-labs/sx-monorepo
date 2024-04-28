<script setup lang="ts">
import { shortenAddress, _n } from '@/helpers/utils';

const route = useRoute();
const usersStore = useUsersStore();
const { setTitle } = useTitle();

const id = route.params.id as string;
const user = computed(() => usersStore.getUser(id));

onMounted(() => usersStore.fetchUser(id));

watchEffect(() => setTitle(`${id} user profile`));
</script>

<template>
  <UiLoading v-if="!user" class="block text-center p-4" />
  <div v-else>
    <div class="relative h-[156px] md:h-[140px] -mb-[86px] md:-mb-[70px]">
      <div class="bg-skin-border h-full top-[-1px]" />
      <div class="relative bg-skin-bg h-[16px] top-[-16px] rounded-t-[16px] md:hidden" />
    </div>
    <UiContainer slim>
      <div class="text-center mb-4 relative">
        <UiStamp
          :id="user.id"
          :size="90"
          class="mb-2 border-[4px] border-skin-bg !bg-skin-border"
        />
        <h1>{{ user.name || shortenAddress(user.id) }}</h1>
        <div>
          <b class="text-skin-link">{{ _n(user.proposal_count) }}</b> proposals ·
          <b class="text-skin-link">{{ _n(user.vote_count) }}</b> votes
        </div>
      </div>
    </UiContainer>
  </div>
</template>
