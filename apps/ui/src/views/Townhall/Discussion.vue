<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { client } from '@/helpers/kbyte';
import { getVotes, newVoteEventToEntry, Result } from '@/helpers/townhall/api';
import { Statement, Vote } from '@/helpers/townhall/types';
import { _n, clone } from '@/helpers/utils';
import {
  useCloseDiscussionMutation,
  useCreateStatementMutation,
  useDiscussionQuery,
  useResultsByRoleQuery,
  useRolesQuery,
  useUserRolesQuery
} from '@/queries/townhall';

const queryClient = useQueryClient();
const route = useRoute();
const { web3 } = useWeb3();

const id = computed(() => Number(route.params.id));
const spaceId = computed(() => route.params.space as string);

const roleFilter = ref('any');
const votes = ref<Vote[]>([]);
const statementInput = ref('');
const view = ref('');

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
const { data: userRoles } = useUserRolesQuery(toRef(() => web3.value.account));
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
    s => !votes.value.find(v => v.statement_id === s.statement_id)
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

client.subscribe(async ([subject, body]) => {
  if (subject === 'justsaying') {
    const event = body.body;

    console.log(body.subject);

    switch (body.subject) {
      case 'new_vote':
        const vote = newVoteEventToEntry(event);

        if (vote.discussion_id !== id.value) {
          return;
        }

        if (vote.voter === web3.value.account) {
          votes.value.push(vote);

          queryClient.setQueryData<Result[]>(
            [
              'townhall',
              'discussionResults',
              { discussionId: id, roleId: roleFilter.value },
              'list'
            ],
            oldData => {
              if (
                roleFilter.value !== 'any' &&
                !userRoles.value?.some(role => role.id === roleFilter.value)
              ) {
                return oldData;
              }

              const updatedData = clone(oldData ?? []);
              const existingResult = updatedData.find(
                r =>
                  r.statement_id === vote.statement_id &&
                  r.choice === vote.choice
              );

              if (existingResult) {
                existingResult.vote_count += 1;
              } else {
                updatedData.push({
                  statement_id: vote.statement_id,
                  choice: vote.choice,
                  vote_count: 1
                });
              }

              return updatedData;
            }
          );
        }

        break;
    }
  }
});

function getStatementVoteCount(statementId: number) {
  return (
    resultsByRole.value?.find(r => r.statement_id === statementId)
      ?.vote_count ?? 0
  );
}

onMounted(async () => {
  client.requestAsync('subscribe', id.value);

  const voter = web3.value.account;
  votes.value = voter ? await getVotes(id.value.toString(), voter) : [];
});

watch(
  () => web3.value.account,
  async () => {
    const voter = web3.value.account;
    votes.value = voter ? await getVotes(id.value.toString(), voter) : [];
  }
);

const STATEMENT_DEFINITION = {
  type: 'string',
  format: 'long',
  title: 'Statement',
  minLength: 1,
  maxLength: 200
};

function toggleAdminView() {
  view.value = !view.value ? 'admin' : '';
}
</script>

<template>
  <div class="mb-6">
    <div v-if="isPending || isRolesPending || isResultsPending" class="my-4">
      <UiLoading class="p-4" />
    </div>
    <div
      v-else-if="isError || isRolesError || isResultsError"
      class="px-4 py-3 flex items-center text-skin-link gap-2"
    >
      <IH-exclamation-circle />
      <span v-text="'Failed to load discussion.'" />
    </div>
    <div v-else-if="discussion">
      <div class="border-b bg-skin-border/10 pb-3 pt-7 mb-6">
        <UiContainer class="!max-w-[740px]">
          <h1 class="leading-[1.1em] mb-4" v-text="discussion.title" />
          <div class="flex">
            <div class="flex-1">
              <div
                v-if="!discussion.closed"
                class="bg-skin-success inline-block rounded-full pl-2 pr-[10px] pb-0.5 text-white mb-2"
              >
                <IS-status-online
                  class="text-white inline-block size-[17px] mb-[1px]"
                />
                Active
              </div>
              <div
                v-else
                class="bg-skin-link inline-block rounded-full pl-2 pr-[10px] pb-0.5 text-skin-bg mb-2"
              >
                <IS-minus-circle
                  class="text-skin-bg inline-block size-[17px] mb-[1px]"
                />
                Closed
              </div>
            </div>
            <div class="flex gap-2">
              <a>
                <IH-share class="text-skin-text inline-block size-[22px]" />
              </a>
              <a
                v-if="web3.account && web3.account === discussion.author"
                @click="toggleAdminView"
              >
                <IH-cog class="text-skin-text inline-block size-[22px]" />
              </a>
            </div>
          </div>
        </UiContainer>
      </div>

      <UiContainer class="!max-w-[740px] s-box space-y-4">
        <template v-if="view === 'admin'">
          <div>
            <h4 class="mb-3 eyebrow flex items-center gap-2">
              <IH-chart-bar />
              Insights
            </h4>
            <div>
              Statements: <b>{{ _n(discussion.statement_count) }}</b>
            </div>
            <div>
              Votes: <b>{{ _n(discussion.vote_count) }}</b>
            </div>
            <div v-if="discussion.vote_count">
              Avg. vote per statement:
              <b>{{
                _n(discussion.vote_count / discussion.statement_count)
              }}</b>
            </div>
          </div>
          <div>
            <h4 class="mb-3 eyebrow flex items-center gap-2">
              <IH-cog />
              Admin
            </h4>
            <UiButton
              v-if="!discussion.closed"
              :loading="isCloseDicussionPending"
              @click="closeDiscussion"
              >Close discussion</UiButton
            >
            <div v-else>The discussion is closed.</div>
          </div>
        </template>

        <template v-else>
          <UiMarkdown
            v-if="discussion.body"
            :body="discussion.body"
            class="pb-4"
          />

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
              <div
                class="text-skin-link font-normal inline-block bg-skin-border text-[13px] rounded-full px-1.5"
              >
                {{ _n(pendingStatements.length) }}
              </div>
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
                v-model="statementInput"
                :definition="STATEMENT_DEFINITION"
                :required="true"
                :disabled="isCreateStatementPending"
              />
              <div>
                <UiButton
                  class="primary items-center flex space-x-1"
                  :disabled="
                    isCreateStatementPending ||
                    !statementInput.trim() ||
                    !web3.account
                  "
                  @click="
                    createStatement(statementInput);
                    statementInput = '';
                  "
                >
                  <div>Publish</div>
                  <IH-paper-airplane class="rotate-90 relative left-[2px]" />
                </UiButton>
              </div>
            </div>
          </div>

          <div v-if="results.length > 0">
            <div class="mb-3 flex">
              <h4 class="eyebrow flex items-center gap-2 flex-1">
                <IH-chart-square-bar />
                Results
                <div
                  class="text-skin-link font-normal inline-block bg-skin-border text-[13px] rounded-full px-1.5"
                >
                  {{ _n(results.length) }}
                </div>
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
                    label: role.name
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
        </template>
      </UiContainer>
    </div>
  </div>
</template>
