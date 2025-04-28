<script setup lang="ts">
import { getDiscussions } from '@/helpers/townhall/api';
import { Discussion } from '@/helpers/townhall/types';
import { _n } from '@/helpers/utils';

const { setTitle } = useTitle();

const loading = ref(false);
const loaded = ref(false);
const discussions = ref([] as Discussion[]);

onMounted(async () => {
  loading.value = true;

  discussions.value = await getDiscussions();

  loaded.value = true;
  loading.value = false;
});

watchEffect(() => setTitle('Ethereum Open Agora'));
</script>

<template>
  <div>
    <div class="py-8">
      <UiContainer class="!max-w-[960px] relative">
        <img
          class="absolute right-0 -top-2 max-w-[440px] z-0"
          src="https://ethereum.org/_next/image/?url=%2Fcontent%2Fcontributing%2Ftranslation-program%2Fenterprise-eth.png&w=1920&q=75"
        />
        <div class="relative z-10">
          <div class="eyebrow mb-4">Open Agora</div>
          <h1 class="font-display text-[54px] mb-4">
            Ethereum's<br />Gathering Space
          </h1>
          <div class="flex space-x-2">
            <router-link
              :to="{ name: 'townhall-create', params: { space: 'ethereum' } }"
            >
              <UiButton primary>Start a discussion</UiButton>
            </router-link>
          </div>
        </div>
      </UiContainer>
    </div>
    <UiContainer class="!max-w-[960px]">
      <div class="eyebrow mb-2.5 text-skin-link">Latest discussions</div>
      <div class="md:border-x border-y md:rounded-lg md:mx-0 -mx-4">
        <div v-if="loading" class="my-3 mx-4">
          <UiLoading v-if="loading" />
        </div>
        <div v-else>
          <div
            v-if="!discussions.length"
            class="px-4 py-3 flex items-center text-skin-link gap-2"
          >
            <IH-exclamation-circle />
            <span v-text="'There are no discussion here.'" />
          </div>
          <router-link
            v-for="(discussion, i) in discussions"
            :key="i"
            :to="{
              name: 'townhall-discussion',
              params: { space: 'ethereum', id: discussion.id }
            }"
            class="py-3 mx-4 block border-b last:border-b-0"
          >
            <div class="mb-1 flex">
              <ProposalIconStatus
                size="17"
                :state="discussion.closed ? 'closed' : 'active'"
                class="top-1 mr-2"
              />
              <h4 class="text-[21px] leading-6" v-text="discussion.title" />
            </div>
            <div class="text-skin-text">
              <UiStamp :id="discussion.author" :size="20" class="mr-2.5" />
              <IH-annotation class="inline-block mr-0.5" />
              {{ _n(discussion.statement_count) }} statements
            </div>
          </router-link>
        </div>
      </div>
    </UiContainer>
  </div>
</template>
