<script setup lang="ts">
import { Result } from '@/helpers/townhall/api';
import { Post, Topic } from '@/helpers/townhall/types';
import { _n, _p, _rt, shortenAddress } from '@/helpers/utils';
import { useSetPostVisibilityMutation } from '@/queries/townhall';

const props = defineProps<{
  spaceId: number;
  topicId: number;
  topic: Topic;
  post: Post;
  results: Result[];
}>();

const { web3 } = useWeb3();
const { mutate: setPostVisibility } = useSetPostVisibilityMutation({
  spaceId: toRef(props, 'spaceId'),
  topicId: toRef(props, 'topicId')
});

const postResults = computed(() => {
  return props.results.filter(result => result.post_id === props.post.post_id);
});

const voteCount = computed(() =>
  postResults.value.reduce((acc, result) => acc + result.vote_count, 0)
);

const choice = computed(() => {
  const scores = [getChoiceResult(1), getChoiceResult(2), getChoiceResult(3)];

  return scores.indexOf(Math.max(...scores)) + 1;
});

function getChoiceResult(choice: 1 | 2 | 3) {
  return (
    postResults.value.find(result => result.choice === choice)?.vote_count ?? 0
  );
}
</script>

<template>
  <div class="p-4 border rounded-md text-md space-y-3">
    <div class="flex">
      <div class="flex-1">
        <div class="text-[17px] flex gap-2 items-center mb-3">
          <UiStamp :id="post.author" :size="20" />
          {{ shortenAddress(post.author) }}
          <span>·</span>
          {{ _rt(post.created) }}
        </div>
        <div class="text-skin-link mb-1">{{ post.body }}</div>
      </div>
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
                  postId: post.post_id,
                  visibility: post.pinned ? 'unpin' : 'pin'
                })
              "
            >
              <IC-pin class="w-[16px] h-[16px]" />
              {{ post.pinned ? 'Unpin' : 'Pin' }} post
            </button>
          </UiDropdownItem>
          <UiDropdownItem v-slot="{ active }">
            <button
              type="button"
              class="flex items-center gap-2"
              :class="{ 'opacity-80': active }"
              @click="
                setPostVisibility({
                  postId: post.post_id,
                  visibility: 'hide'
                })
              "
            >
              <IH-flag :width="16" />
              Hide post
            </button>
          </UiDropdownItem>
        </template>
      </UiDropdown>
    </div>
    <div class="flex text-[17px] items-center gap-2.5">
      <div
        v-if="postResults.length > 0"
        :class="{
          'bg-skin-success/10 border-skin-success': choice === 1,
          'bg-skin-danger/10 border-skin-danger': choice === 2,
          'bg-skin-text/10 border-skin-text': choice === 3
        }"
        class="border text-skin-link rounded-md inline-block px-2.5 py-1"
      >
        <div v-if="choice === 1">
          <IH-check class="inline-block text-skin-success" />
          {{ _p(getChoiceResult(choice) / voteCount, 1) }} agree
        </div>
        <div v-else-if="choice === 2">
          <IH-x class="inline-block text-skin-danger" />
          {{ _p(getChoiceResult(choice) / voteCount, 1) }} disagree
        </div>
        <div v-else-if="choice === 3">
          <IH-minus-sm class="inline-block text-skin-text" />
          {{ _p(getChoiceResult(choice) / voteCount, 1) }} pass
        </div>
      </div>
      <div class="flex-1" v-text="`${_n(voteCount)} votes`" />
      <div class="justify-end" v-text="`#${post.post_id}`" />
      <IC-pin v-if="post.pinned" class="w-[16px] h-[16px]" />
    </div>
  </div>
</template>
