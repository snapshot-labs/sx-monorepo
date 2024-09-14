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
            <WhiteLabelAwareLink
              :to="{
                name: 'space-discussions-topic',
                params: { topic: topic.id }
              }"
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
            </WhiteLabelAwareLink>
          </div>
        </div>
        <div class="inline">
          <span class="mr-2.5">
            <img
              v-for="(user, i) in topic.users"
              :key="i"
              :src="user.avatar_template"
              class="rounded-full size-[22px] inline-block -mr-1.5 border-2 border-skin-bg bg-skin-border"
            />
          </span>
          <a
            :href="topic.user_url"
            target="_blank"
            class="text-skin-text"
            v-text="topic.latest_poster.name || topic.latest_poster.username"
          />
        </div>
        <span> · {{ _rt(topic.updated) }}</span>
        <span> · {{ _n(topic.posts_count) }} replies</span>
      </div>
    </div>
  </div>
</template>
