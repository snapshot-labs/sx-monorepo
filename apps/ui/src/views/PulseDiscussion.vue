<script setup lang="ts">
import { client } from '@/helpers/kbyte';
import { Discussion, Statement, Vote } from '@/helpers/pulse';
import {
  getDiscussion,
  getVotes,
  newStatementEventToEntry,
  newVoteEventToEntry
} from '@/helpers/townhall';
import { _n, clone } from '@/helpers/utils';

const route = useRoute();
const { web3 } = useWeb3();
const { addNotification } = useUiStore();
const { sendStatement } = useTownhall();

const id = parseInt(route.params.id as string);

const discussion = ref<Discussion | null>(null);
const statements = ref<Statement[]>([]);
const votes = ref<Vote[]>([]);
const loading = ref(false);
const loaded = ref(false);
const submitLoading = ref(false);
const statementInput = ref('');

const pendingStatements: ComputedRef<Statement[]> = computed(() =>
  statements.value.filter(
    s => !votes.value.find(v => v.statement_id === s.statement_id)
  )
);
const results: ComputedRef<Statement[]> = computed(() =>
  clone(statements.value).sort((a, b) => b.vote_count - a.vote_count)
);

client.subscribe(([subject, body]) => {
  if (subject === 'justsaying') {
    if (body.subject === 'new_statement') {
      const statement = newStatementEventToEntry(body.body);

      if (statement.discussion_id === id) {
        statements.value = [...statements.value, statement];
      }
    }

    if (body.subject === 'new_vote') {
      const vote = newVoteEventToEntry(body.body);

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
    }
  }
});

onMounted(async () => {
  loading.value = true;

  discussion.value = await getDiscussion(id.toString());
  statements.value = discussion?.value?.statements || [];
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
  maxLength: 256
};

async function handleSubmit() {
  submitLoading.value = true;

  try {
    await sendStatement(id, statementInput.value);

    statementInput.value = '';
  } catch (e) {
    addNotification('error', e.message);
  }

  submitLoading.value = false;
}
</script>

<template>
  <div class="mb-6 pt-4">
    <UiLoading v-if="loading" class="p-4" />
    <UiContainer
      v-else-if="loaded && discussion"
      class="!max-w-[740px] s-box space-y-5 mt-3"
    >
      <div class="space-y-3">
        <h1 class="leading-[1.1em] mb-3" v-text="discussion.title" />
        <UiMarkdown v-if="discussion.body" :body="discussion.body" />
      </div>

      <div v-if="pendingStatements.length > 0">
        <h4 class="mb-3 eyebrow flex items-center gap-2">
          <IH-eye />
          Pending statement(s)
          <div
            class="text-skin-link font-normal inline-block bg-skin-border text-[13px] rounded-full px-1.5"
          >
            {{ _n(pendingStatements.length) }}
          </div>
        </h4>
        <PulseStatements :statements="pendingStatements" />
      </div>

      <div>
        <h4 class="mb-3 eyebrow flex items-center gap-2">
          <IH-pencil />
          Add a statement
        </h4>
        <div class="p-4 border rounded-md">
          <div class="mb-3">
            <IH-light-bulb
              class="inline-block align-middle relative -top-0.5"
            />
            Share one clear, concise idea or opinion without targeting
            individuals, so everyone can easily understand and vote on it.
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
            <span class="text-skin-link">agree %</span>
            <IH-arrow-sm-down class="inline-block ml-2" />
          </div>
        </div>
        <div class="space-y-3">
          <PulseStatementItem
            v-for="(s, i) in results"
            :key="i"
            :statement="s"
          />
        </div>
      </div>
    </UiContainer>
  </div>
</template>
