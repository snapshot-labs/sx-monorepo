<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { shortenAddress } from '@/helpers/utils';
import apollo from '@/helpers/apollo';
import { USER_QUERY } from '@/helpers/queries';
import { useState } from '@/composables/useState';

const route = useRoute();
const { get, set } = useState();
const id = route.params.id;
let user = $ref({});
let loaded = $ref(false);

onMounted(async () => {
  const state = get();
  if (state?.users[id]) {
    user = state.users[id];
  } else {
    const { data } = await apollo.query({
      query: USER_QUERY,
      variables: { id }
    });
    state.users[id] = data.user;
    user = data.user;
    set(state);
  }
  loaded = true;
});
</script>

<template>
  <UiLoading v-if="!loaded" class="block text-center p-4" />
  <div v-else>
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
