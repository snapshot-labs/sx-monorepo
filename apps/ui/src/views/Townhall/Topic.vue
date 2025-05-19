<script setup lang="ts">
import { Statement } from '@/helpers/townhall/types';
import { _n, _rt, clone, shortenAddress } from '@/helpers/utils';
import {
  useCloseDiscussionMutation,
  useCreateStatementMutation,
  useDiscussionQuery,
  useResultsByRoleQuery,
  useRolesQuery,
  useUserVotesQuery
} from '@/queries/townhall';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const route = useRoute();
const { web3 } = useWeb3();
const { setTitle } = useTitle();
const { setContext, setVars, openChatbot } = useChatbot();

const id = computed(() => Number(route.params.id));
const spaceId = '1';

const roleFilter = ref('any');
const statement = ref('');

const {
  data: discussion,
  isPending,
  isError
} = useDiscussionQuery({ spaceId, discussionId: id });
const {
  data: roles,
  isPending: isRolesPending,
  isError: isRolesError
} = useRolesQuery(spaceId);
const {
  data: resultsByRole,
  isPending: isResultsPending,
  isError: isResultsError
} = useResultsByRoleQuery({ discussionId: id, roleId: roleFilter });
const {
  data: userVotes,
  isPending: isUserVotesPending,
  isError: isUserVotesError
} = useUserVotesQuery({
  spaceId,
  discussionId: id,
  user: toRef(() => web3.value.account)
});
const { mutate: createStatement, isPending: isCreateStatementPending } =
  useCreateStatementMutation({
    spaceId,
    discussionId: id
  });
const { mutate: closeDiscussion, isPending: isCloseDicussionPending } =
  useCloseDiscussionMutation({
    spaceId,
    discussionId: id
  });

const pendingStatements: ComputedRef<Statement[]> = computed(() =>
  (discussion.value?.statements ?? []).filter(
    s => !(userVotes.value ?? []).find(v => v.statement_id === s.statement_id)
  )
);

const results: ComputedRef<Statement[]> = computed(() =>
  clone(discussion.value?.statements ?? [])
    .filter(s => !s.hidden)
    .sort(
      (a, b) =>
        getStatementVoteCount(b.statement_id) -
        getStatementVoteCount(a.statement_id)
    )
    .sort((a, b) => Number(b.pinned) - Number(a.pinned))
);

function getStatementVoteCount(statementId: number) {
  return (
    resultsByRole.value?.find(r => r.statement_id === statementId)
      ?.vote_count ?? 0
  );
}

const STATEMENT_DEFINITION = {
  type: 'string',
  format: 'long',
  title: 'Statement',
  minLength: 1,
  maxLength: 200
};

watchEffect(() => {
  if (!discussion.value) return;

  setTitle(discussion.value ? discussion?.value.title : '');
  setContext({
    purpose:
      'This is a topic page where you can add statements (ideas, feedback, opinions) for consensus-driven discussion. Each statement should express one clear, concise idea.',
    data: {
      topic: {
        id: discussion.value.id,
        title: discussion.value.title,
        body: discussion.value.body,
        vote_count: discussion.value.vote_count
      },
      space: {
        id: props.space.id,
        name: props.space.name,
        about: props.space.about
      }
    },
    inputs: {
      statement: {
        value: statement.value,
        definition: STATEMENT_DEFINITION
      }
    }
  });
  setVars({ statement });
});
</script>

<template>
  <div>
    <div
      v-if="
        isPending || isRolesPending || isUserVotesPending || isResultsPending
      "
      class="my-4"
    >
      <UiLoading class="p-4" />
    </div>
    <div
      v-else-if="isError || isRolesError || isUserVotesError || isResultsError"
      class="px-4 py-3 flex items-center text-skin-link gap-2"
    >
      <IH-exclamation-circle />
      <span v-text="'Failed to load discussion.'" />
    </div>
    <div v-else-if="discussion">
      <UiContainer class="!max-w-[740px] space-y-4 pt-6 pb-4">
        <h1 class="leading-[1.1em]" v-text="discussion.title" />
        <div v-if="discussion.closed" class="items-center gap-1 flex">
          <IS-lock-closed class="text-skin-text" />
          <span v-text="'Topic closed'" />
        </div>
        <div class="flex justify-between">
          <div class="text-[17px] flex gap-2 items-center">
            <UiStamp :id="discussion.author" :size="20" />
            {{ shortenAddress(discussion.author) }}
            <span>·</span>
            {{ _rt(discussion.created) }}
          </div>
          <UiDropdown
            v-if="
              web3.account &&
              discussion.author === web3.account &&
              !discussion.closed
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
                  @click="closeDiscussion()"
                >
                  <template v-if="isCloseDicussionPending">
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
        <UiMarkdown
          v-if="discussion.body"
          :body="discussion.body"
          class="pb-4"
        />
      </UiContainer>

      <UiContainer class="!max-w-[740px] s-box space-y-4">
        <div v-if="discussion.discussion_url">
          <h4 class="mb-3 eyebrow flex items-center gap-2">
            <IH-chat-alt />
            <span>Discussion</span>
          </h4>
          <a
            :href="discussion.discussion_url"
            target="_blank"
            class="block mb-5"
          >
            <UiLinkPreview
              :url="discussion.discussion_url"
              :show-default="true"
            />
          </a>
        </div>

        <div v-if="!discussion.closed && pendingStatements.length > 0">
          <h4 class="mb-3 eyebrow flex items-center gap-2">
            <IH-eye />
            Pending statement(s)
            <span
              class="text-skin-link font-normal inline-block bg-skin-border text-[13px] rounded-full px-1.5"
            >
              {{ _n(pendingStatements.length) }}
            </span>
          </h4>
          <TownhallStatements
            :space-id="spaceId"
            :discussion-id="id"
            :discussion="discussion"
            :statements="pendingStatements"
          />
        </div>

        <div v-if="!discussion.closed">
          <h4 class="mb-3 eyebrow flex items-center gap-2">
            <IH-pencil />
            Add a statement
          </h4>
          <div class="p-4 border rounded-md">
            <div class="mb-3">
              <IH-light-bulb
                class="inline-block align-middle relative -top-0.5"
              />
              Share one clear, concise idea or opinion, so everyone can easily
              understand and vote.
            </div>
            <UiTextarea
              v-model="statement"
              :definition="STATEMENT_DEFINITION"
              :required="true"
              :disabled="isCreateStatementPending"
            />
            <div class="flex gap-2.5 items-center">
              <UiButton
                class="primary items-center flex space-x-1"
                :disabled="
                  isCreateStatementPending || !statement.trim() || !web3.account
                "
                @click="
                  createStatement(statement);
                  statement = '';
                "
              >
                <div>Publish</div>
                <IH-paper-airplane class="rotate-90 relative left-[2px]" />
              </UiButton>
              <div>
                <a
                  class="flex items-center gap-1.5"
                  @click="openChatbot('Suggest statement')"
                >
                  <IH-sparkles />
                  Suggest statement
                </a>
              </div>
            </div>
          </div>
        </div>

        <div v-if="results.length > 0">
          <div class="mb-3 flex">
            <h4 class="eyebrow flex items-center gap-2 flex-1">
              <IH-chart-square-bar />
              Statements
              <span
                class="text-skin-link font-normal inline-block bg-skin-border text-[13px] rounded-full px-1.5"
              >
                {{ _n(results.length) }}
              </span>
            </h4>
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
          </div>
          <div class="space-y-3">
            <TownhallStatementItem
              v-for="(s, i) in results"
              :key="i"
              :space-id="spaceId"
              :discussion-id="id"
              :discussion="discussion"
              :statement="s"
              :results="resultsByRole ?? []"
            />
          </div>
        </div>
      </UiContainer>
    </div>
  </div>
</template>
