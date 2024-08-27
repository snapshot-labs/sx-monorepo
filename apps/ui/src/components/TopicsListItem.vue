<script setup lang="ts">
import { Topic } from '@/helpers/discourse';
import { _n, _rt } from '@/helpers/utils';

defineProps<{ topic: Topic }>();
</script>
<template>
  <div>
    <div class="border-b mx-4 py-[14px] flex">
      <div class="flex-auto mr-4 w-0">
        <div class="space-x-2 flex">
          <div class="md:flex md:min-w-0 my-1 items-center leading-6">
            <a
              :href="topic.url"
              target="_blank"
              class="md:flex md:min-w-0 space-x-1.5"
            >
              <IC-pin
                v-if="topic.pinned"
                class="inline-block shrink-0 md:mt-1.5 size-[14px]"
              />
              <IS-lock-closed
                v-if="topic.closed"
                class="inline-block shrink-0 size-[16px] -mt-1 md:mt-1"
              />
              <h3 class="text-[21px] inline md:truncate" v-text="topic.title" />
              <IH-arrow-sm-right
                class="-rotate-45 inline-block shrink-0 relative top-[-1px] md:top-0.5"
              />
            </a>
          </div>
        </div>
        <div class="inline">
          <span>
            <img
              v-for="(user, i) in topic.users"
              :key="i"
              :src="user.avatar_template"
              class="rounded-full size-[22px] inline-block -ml-1.5 border-2 border-skin-bg bg-skin-border"
            />
          </span>
          by
          <a :href="topic.user_url" target="_blank" class="text-skin-text">{{
            topic.username
          }}</a>
        </div>
        <span> · {{ _rt(topic.created) }}</span>
        <span> · {{ _n(topic.posts_count) }} replies</span>
        <span> · {{ _n(topic.views, 'compact') }} views</span>
      </div>
    </div>
  </div>
</template>
