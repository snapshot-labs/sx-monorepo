<script setup lang="ts">
import { Post, Space as TownhallSpace } from '@/helpers/townhall/types';
import { _n, _rt, clone, shortenAddress } from '@/helpers/utils';
import {
  useCloseTopicMutation,
  useCreatePostMutation,
  useResultsByRoleQuery,
  useRolesQuery,
  useTopicQuery,
  useUserRolesQuery,
  useUserVotesQuery
} from '@/queries/townhall';
import { Space } from '@/types';

const props = defineProps<{ space: Space; townhallSpace: TownhallSpace }>();

const route = useRoute();
const { web3 } = useWeb3();
const { setTitle } = useTitle();
const { setContext, setVars, openChatbot } = useChatbot();

const spaceId = toRef(() => props.townhallSpace.space_id);
const id = computed(() => Number(route.params.id));

const roleFilter: Ref<string> = ref('any');
const sortBy: Ref<'agree' | 'disagree' | 'votes' | 'recent'> = ref('agree');
const body: Ref<string> = ref('');

const {
  data: topic,
  isPending,
  isError
} = useTopicQuery({
  spaceId,
  topicId: id
});
const { data: roles, isError: isRolesError } = useRolesQuery(spaceId);
const {
  data: resultsByRole,
  isPending: isResultsPending,
  isError: isResultsError
} = useResultsByRoleQuery({
  spaceId,
  topicId: id,
  roleId: roleFilter
});
const { data: userRoles } = useUserRolesQuery({
  spaceId,
  user: toRef(() => web3.value.account)
});
const { data: userVotes, isError: isUserVotesError } = useUserVotesQuery({
  spaceId,
  topicId: id,
  user: toRef(() => web3.value.account)
});
const { mutate: createPost, isPending: isCreatePostPending } =
  useCreatePostMutation({
    spaceId,
    topicId: id
  });
const { mutate: closeTopic, isPending: isCloseTopicPending } =
  useCloseTopicMutation({
    spaceId,
    topicId: id
  });

const pendingPosts: ComputedRef<Post[]> = computed(() =>
  (topic.value?.posts ?? [])
    .filter(s => !(userVotes.value ?? []).find(v => v.post_id === s.post_id))
    .sort(() => 0.5 - Math.random())
);

const results: ComputedRef<Post[]> = computed(() =>
  clone(topic.value?.posts ?? [])
    .filter(s => !s.hidden && getPostVoteCount(s.post_id) > 0)
    .sort((a, b) => {
      if (sortBy.value === 'agree')
        return b.scores_1 / b.vote_count - a.scores_1 / a.vote_count;

      if (sortBy.value === 'disagree')
        return b.scores_2 / b.vote_count - a.scores_2 / a.vote_count;

      if (sortBy.value === 'recent') return b.created - a.created;

      return b.vote_count - a.vote_count;
    })
    .sort((a, b) => Number(b.pinned) - Number(a.pinned))
);

function getPostVoteCount(postId: number) {
  return resultsByRole.value?.find(r => r.post_id === postId)?.vote_count ?? 0;
}

const BODY_DEFINITION = {
  type: 'string',
  format: 'long',
  title: 'Body',
  minLength: 1,
  maxLength: 200
};

watchEffect(() => {
  if (!topic.value) return;

  if (roleFilter.value !== 'any') {
    sortBy.value = 'recent';
  }

  setTitle(topic.value ? topic?.value.title : '');
  setContext({
    purpose:
      'This is a topic page where you can add posts (ideas, feedback, opinions) for consensus-driven discussion. Each post should express one clear, concise idea.',
    data: {
      topic: {
        id: topic.value.id,
        title: topic.value.title,
        body: topic.value.body,
        vote_count: topic.value.vote_count
      },
      space: {
        id: props.space.id,
        name: props.space.name,
        about: props.space.about
      }
    },
    inputs: {
      body: {
        value: body.value,
        definition: BODY_DEFINITION
      }
    }
  });
  setVars({ body });
});
</script>

<template>
  <div>
    <div v-if="isPending" class="py-4">
      <UiLoading class="p-4" />
    </div>
    <div
      v-else-if="isError || isRolesError || isUserVotesError || isResultsError"
      class="px-4 py-3 flex items-center text-skin-link gap-2"
    >
      <IH-exclamation-circle />
      <span v-text="'Failed to load discussion.'" />
    </div>
    <div v-else-if="topic">
      <UiContainer class="!max-w-[760px] space-y-4 pt-6 pb-4">
        <h1 class="leading-[1.1em]" v-text="topic.title" />
        <div v-if="topic.closed" class="items-center gap-1 flex">
          <IS-lock-closed class="text-skin-text" />
          <span v-text="'Topic closed'" />
        </div>
        <div class="flex justify-between">
          <div class="text-[17px] flex gap-2 items-center">
            <UiStamp :id="topic.author" :size="20" />
            {{ shortenAddress(topic.author) }}
            <span>·</span>
            {{ _rt(topic.created) }}
            <template v-if="topic.category">
              <span>·</span>
              <span>
                {{ 'in ' }}
                <router-link
                  :to="{
                    name: 'space-townhall-category-topics',
                    params: {
                      category: topic.category.category_id,
                      category_slug: topic.category.slug
                    }
                  }"
                >
                  {{ topic.category.name }}
                </router-link>
              </span>
            </template>
          </div>
          <UiDropdown
            v-if="
              web3.account && topic.author === web3.account && !topic.closed
            "
          >
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
                  @click="closeTopic()"
                >
                  <template v-if="isCloseTopicPending">
                    <UiLoading :size="18" />
                  </template>
                  <template v-else>
                    <IS-lock-closed class="w-[16px] h-[16px]" />
                  </template>
                  Close topic
                </button>
              </UiDropdownItem>
            </template>
          </UiDropdown>
        </div>
        <UiMarkdown v-if="topic.body" :body="topic.body" class="pb-4" />
      </UiContainer>

      <UiContainer class="!max-w-[760px] s-box space-y-4">
        <div v-if="topic.discussion_url">
          <h4 class="mb-3 eyebrow flex items-center gap-2">
            <IH-chat-alt />
            <span>Discussion</span>
          </h4>
          <a :href="topic.discussion_url" target="_blank" class="block mb-5">
            <UiLinkPreview :url="topic.discussion_url" :show-default="true" />
          </a>
        </div>

        <div v-if="!topic.closed && pendingPosts.length > 0">
          <h4 class="mb-3 eyebrow flex items-center gap-2">
            <IH-eye />
            Pending post(s)
            <span
              class="text-skin-link font-normal inline-block bg-skin-border text-[13px] rounded-full px-1.5"
            >
              {{ _n(pendingPosts.length) }}
            </span>
          </h4>
          <TownhallPosts
            :space-id="townhallSpace.space_id"
            :topic-id="id"
            :topic="topic"
            :posts="pendingPosts"
          />
        </div>

        <div v-if="!topic.closed">
          <h4 class="mb-3 eyebrow flex items-center gap-2">
            <IH-pencil />
            Add a post
          </h4>
          <UiAlert
            v-if="userRoles && userRoles.length === 0"
            type="warning"
            class="mb-4"
          >
            You need to
            <router-link
              :to="{ name: 'space-townhall-roles' }"
              class="font-semibold"
            >
              claim a role
            </router-link>
            before adding a post.
          </UiAlert>
          <div v-else class="p-4 border rounded-md">
            <div class="mb-3">
              <IH-light-bulb
                class="inline-block align-middle relative -top-0.5"
              />
              Share one clear, concise idea or opinion, so everyone can easily
              understand and vote.
            </div>
            <UiTextarea
              v-model="body"
              :definition="BODY_DEFINITION"
              :required="true"
              :disabled="isCreatePostPending"
            />
            <div class="flex gap-2.5 items-center">
              <UiButton
                class="primary items-center justify-center flex space-x-1"
                :disabled="isCreatePostPending || !body.trim() || !web3.account"
                :loading="isCreatePostPending"
                @click="
                  createPost(body);
                  body = '';
                "
              >
                <div>Publish</div>
                <IH-paper-airplane class="rotate-90 relative left-[2px]" />
              </UiButton>

              <button
                class="text-skin-link flex items-center gap-1.5"
                @click="openChatbot('Suggest post')"
              >
                <IH-sparkles />
                Suggest post
              </button>
            </div>
          </div>
        </div>

        <div>
          <div class="mb-3 flex">
            <h4 class="eyebrow flex items-center gap-2 flex-1">
              <IH-chart-square-bar />
              Posts
              <span
                class="text-skin-link font-normal inline-block bg-skin-border text-[13px] rounded-full px-1.5"
              >
                {{ _n(results.length) }}
              </span>
            </h4>
            <div class="flex gap-2">
              <UiSelectDropdown
                v-model="roleFilter"
                title="Role"
                gap="12"
                placement="start"
                :items="[
                  { key: 'any', label: 'Any role' },
                  ...(roles || []).map(role => ({
                    key: role.id,
                    label: role.name,
                    indicatorStyle: { background: role.color }
                  }))
                ]"
              />
              <UiSelectDropdown
                v-model="sortBy"
                :disabled="roleFilter !== 'any'"
                title="Sort by"
                gap="12"
                placement="start"
                :items="[
                  { key: 'agree', label: '% agreed' },
                  { key: 'disagree', label: '% disagreed' },
                  { key: 'votes', label: 'Number of votes' },
                  { key: 'recent', label: 'Most recent' }
                ]"
              />
            </div>
          </div>
          <div class="space-y-3">
            <div v-if="isResultsPending">
              <UiLoading class="p-4" />
            </div>
            <div
              v-else-if="results.length === 0"
              class="flex gap-2 items-center"
            >
              <IH-exclamation-circle class="inline-block shrink-0" />
              <span>There are no posts here.</span>
            </div>
            <TownhallPostItem
              v-for="(s, i) in results"
              :key="i"
              :space-id="townhallSpace.space_id"
              :topic-id="id"
              :topic="topic"
              :post="s"
              :results="resultsByRole ?? []"
            />
          </div>
        </div>
      </UiContainer>
    </div>
  </div>
</template>
