<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { getDiscussions } from '@/helpers/townhall/api';
import { _n } from '@/helpers/utils';
import { Space } from '@/types';

defineProps<{ space: Space }>();

const { setTitle } = useTitle();

const {
  data: discussions,
  isPending,
  isError
} = useQuery({
  queryKey: ['townhall', 'discussions', 'list'],
  queryFn: getDiscussions
});

watchEffect(() => setTitle('Ethereum Open Agora'));
</script>

<template>
  <div>
    <div class="flex justify-end p-4">
      <router-link
        :to="{
          name: 'space-townhall-create',
          params: { space: `${space.network}:${space.id}` }
        }"
      >
        <UiButton primary>New topic</UiButton>
      </router-link>
    </div>
    <div>
      <UiLabel label="Latest topics" sticky />
      <div>
        <div v-if="isPending" class="my-3 mx-4">
          <UiLoading />
        </div>
        <div v-else>
          <div
            v-if="isError"
            class="px-4 py-3 flex items-center text-skin-link gap-2"
          >
            <IH-exclamation-circle />
            <span v-text="'Failed to load discussions.'" />
          </div>
          <div
            v-if="discussions?.length === 0"
            class="px-4 py-3 flex items-center text-skin-link gap-2"
          >
            <IH-exclamation-circle />
            <span v-text="'There are no discussions here.'" />
          </div>
          <router-link
            v-for="(discussion, i) in discussions"
            :key="i"
            :to="{
              name: 'space-townhall-topic',
              params: {
                space: `${space.network}:${space.id}`,
                id: discussion.id
              }
            }"
            class="py-3 mx-4 block border-b"
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
              {{ _n(discussion.statement_count) }} replies
            </div>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>
