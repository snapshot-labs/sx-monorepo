<script setup lang="ts">
import { client } from '@/helpers/kbyte';
import {
  getDiscussion,
  getVotes,
  newStatementEventToEntry,
  newVoteEventToEntry
} from '@/helpers/townhall/api';
import { Discussion, Statement, Vote } from '@/helpers/townhall/types';
import { _n, clone } from '@/helpers/utils';

const route = useRoute();
const { web3 } = useWeb3();
const { addNotification } = useUiStore();
const { sendStatement, sendCloseDiscussion } = useTownhall();

const id = parseInt(route.params.id as string);

const discussion = ref<Discussion | null>(null);
const statements = ref<Statement[]>([]);
const votes = ref<Vote[]>([]);
const loading = ref(false);
const loaded = ref(false);
const submitLoading = ref(false);
const closeDiscussionLoading = ref(false);
const statementInput = ref('');
const view = ref('');

const pendingStatements: ComputedRef<Statement[]> = computed(() =>
  statements.value.filter(
    s => !votes.value.find(v => v.statement_id === s.statement_id)
  )
);
const results: ComputedRef<Statement[]> = computed(() =>
  clone(statements.value)
    .filter(s => !s.hidden)
    .sort((a, b) => b.vote_count - a.vote_count)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned))
);

client.subscribe(([subject, body]) => {
  if (subject === 'justsaying') {
    const event = body.body;

    console.log(body.subject);

    switch (body.subject) {
      case 'new_statement':
        const statement = newStatementEventToEntry(event);

        if (statement.discussion_id === id) {
          statements.value = [...statements.value, statement];
        }

        break;
      case 'hide_statement':
        if (event.discussion === id) {
          const statementIndex = statements.value.findIndex(
            s => s.statement_id === event.statement
          );

          if (statementIndex !== -1) {
            statements.value = clone(
              statements.value.filter((_, i) => i !== statementIndex)
            );
          }
        }

        break;
      case 'pin_statement':
        if (event.discussion === id) {
          const statementIndex = statements.value.findIndex(
            s => s.statement_id === event.statement
          );

          if (statementIndex !== -1) {
            const statementsClone = clone(statements.value);
            statementsClone[statementIndex].pinned = true;
            statements.value = statementsClone;
          }
        }

        break;
      case 'close_discussion':
        if (event.discussion === id && discussion.value) {
          const discussionClone = clone(discussion.value);
          discussionClone.closed = true;
          discussion.value = discussionClone;
        }

        break;
      case 'new_vote':
        const vote = newVoteEventToEntry(event);

        if (vote.discussion_id === id) {
          if (vote.voter === web3.value.account) {
            votes.value = [...votes.value, vote];
          }

          const statementIndex = statements.value.findIndex(
            s => s.statement_id === vote.statement_id
          );
          const statement = clone(statements.value[statementIndex]);
          statement.vote_count += 1;
          statement[`scores_${vote.choice}`] += 1;

          const statementsClone = clone(statements.value);
          statementsClone[statementIndex] = statement;
          statements.value = statementsClone;
        }

        break;
    }
  }
});

onMounted(async () => {
  loading.value = true;

  discussion.value = await getDiscussion(id.toString());
  statements.value = (discussion?.value?.statements || [])
    .filter(s => !s.hidden)
    .sort(() => 0.5 - Math.random())
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  client.requestAsync('subscribe', id);

  const voter = web3.value.account;
  votes.value = voter ? await getVotes(id.toString(), voter) : [];

  loading.value = false;
  loaded.value = true;
});

watch(
  () => web3.value.account,
  async () => {
    const voter = web3.value.account;
    votes.value = voter ? await getVotes(id.toString(), voter) : [];
  }
);

const STATEMENT_DEFINITION = {
  type: 'string',
  format: 'long',
  title: 'Statement',
  minLength: 1,
  maxLength: 200
};

async function handleSubmit() {
  submitLoading.value = true;

  try {
    await sendStatement(id, statementInput.value);
    addNotification('success', 'Statement published successfully');

    statementInput.value = '';
  } catch (e) {
    addNotification('error', e.message);
  } finally {
    submitLoading.value = false;
  }
}

async function handleCloseDiscussion() {
  closeDiscussionLoading.value = true;

  try {
    await sendCloseDiscussion(id);
    addNotification('success', 'Discussion closed successfully');
  } catch (e) {
    addNotification('error', e.message);
  } finally {
    closeDiscussionLoading.value = false;
  }
}

function toggleAdminView() {
  view.value = !view.value ? 'admin' : '';
}
</script>

<template>
  <div class="mb-6">
    <div v-if="loading" class="my-4">
      <UiLoading class="p-4" />
    </div>
    <div v-else-if="loaded && discussion">
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
              :loading="closeDiscussionLoading"
              @click="handleCloseDiscussion"
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
                :disabled="submitLoading"
              />
              <div>
                <UiButton
                  class="primary items-center flex space-x-1"
                  :disabled="
                    submitLoading || !statementInput.trim() || !web3.account
                  "
                  @click="handleSubmit"
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
              <div>
                Sort by:
                <span class="text-skin-link">newest</span>
                <IH-arrow-sm-down class="inline-block ml-2" />
              </div>
            </div>
            <div class="space-y-3">
              <TownhallStatementItem
                v-for="(s, i) in results"
                :key="i"
                :discussion="discussion"
                :statement="s"
              />
            </div>
          </div>
        </template>
      </UiContainer>
    </div>
  </div>
</template>
