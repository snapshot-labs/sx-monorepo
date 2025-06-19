<script setup lang="ts">
import { Post, Topic } from '@/helpers/townhall/types';
import {
  useSetPostVisibilityMutation,
  useUserRolesQuery,
  useVoteMutation
} from '@/queries/townhall';

const props = defineProps<{
  spaceId: number;
  topicId: number;
  topic: Topic;
  posts: Post[];
}>();

const { web3 } = useWeb3();

const { data: userRoles } = useUserRolesQuery({
  spaceId: toRef(props, 'spaceId'),
  user: toRef(() => web3.value.account)
});
const { mutate: vote, isPending: isVotePending } = useVoteMutation({
  spaceId: toRef(props, 'spaceId'),
  topicId: toRef(props, 'topicId'),
  userRoles
});
const { mutate: setPostVisibility, isPending: isSetPostVisibilityPending } =
  useSetPostVisibilityMutation({
    spaceId: toRef(props, 'spaceId'),
    topicId: toRef(props, 'topicId')
  });
</script>

<template>
  <div v-if="posts[0]">
    <div class="border rounded-md p-4 min-h-[220px] flex flex-col">
      <div class="text-lg text-skin-link flex-auto">
        <UiLoading v-if="isVotePending" />
        <div v-else class="flex">
          <div class="flex-1 mr-3 mb-4" v-text="posts[0].body" />
          <UiDropdown v-if="web3.account && topic.author === web3.account">
            <template #button>
              <UiButton class="!p-0 !border-0 !h-[auto] !bg-transparent">
                <IH-dots-horizontal class="text-skin-link" />
              </UiButton>
            </template>
            <template #items>
              <UiDropdownItem v-slot="{ active }">
                <button
                  type="button"
                  class="flex items-center gap-2"
                  :class="{ 'opacity-80': active }"
                  @click="
                    setPostVisibility({
                      postId: posts[0].post_id,
                      visibility: posts[0].pinned ? 'unpin' : 'pin'
                    })
                  "
                >
                  <IC-pin class="w-[16px] h-[16px]" />
                  {{ posts[0].pinned ? 'Unpin' : 'Pin' }} statement
                </button>
              </UiDropdownItem>
              <UiDropdownItem v-slot="{ active }">
                <button
                  type="button"
                  class="flex items-center gap-2"
                  :class="{ 'opacity-80': active }"
                  :disabled="isSetPostVisibilityPending"
                  @click="
                    setPostVisibility({
                      postId: posts[0].post_id,
                      visibility: 'hide'
                    })
                  "
                >
                  <IH-flag :width="16" />
                  Hide statement
                </button>
              </UiDropdownItem>
            </template>
          </UiDropdown>
        </div>
      </div>
      <div class="items-end space-x-2 grid grid-cols-3">
        <UiButton
          :disabled="isVotePending"
          class="!border-skin-success !text-skin-success space-x-1"
          @click="vote({ postId: posts[0].post_id, choice: 1 })"
        >
          <IH-check class="inline-block" />
          <span class="hidden sm:inline-block" v-text="'Agree'" />
        </UiButton>
        <UiButton
          :disabled="isVotePending"
          class="!border-skin-danger !text-skin-danger space-x-1"
          @click="vote({ postId: posts[0].post_id, choice: 2 })"
        >
          <IH-x class="inline-block" />
          <span class="hidden sm:inline-block" v-text="'Disagree'" />
        </UiButton>
        <UiButton
          :disabled="isVotePending"
          class="!border-skin-text !text-skin-text space-x-1"
          @click="vote({ postId: posts[0].post_id, choice: 3 })"
        >
          <IH-minus-sm class="inline-block" />
          <span class="hidden sm:inline-block" v-text="'Pass'" />
        </UiButton>
      </div>
    </div>
    <div class="h-4">
      <div v-if="posts[1]" class="mx-1">
        <div class="border border-t-0 rounded-b-md h-2" />
        <div v-if="posts[2]" class="mx-1">
          <div class="border border-t-0 rounded-b-md h-2" />
          <div v-if="posts[3]" class="mx-1">
            <div class="border border-t-0 rounded-b-md h-2" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
