<script setup lang="ts">
import { Discussion, Statement } from '@/helpers/pulse';
import { _n } from '@/helpers/utils';

const route = useRoute();
const { web3 } = useWeb3();
const { discussions, votes, loadDiscussion, loadVotes, sendStatement } =
  usePulse();

const id = parseInt(route.params.id as string);

const loading = ref(false);
const loaded = ref(false);
const submitLoading = ref(false);
const statement = ref('');

const discussion: ComputedRef<Discussion> = computed(
  () => discussions.value[id]
);
const statements: ComputedRef<Statement[]> = computed(
  () => discussion.value.statements
);
const pendingStatements: ComputedRef<Statement[]> = computed(() =>
  statements.value.filter(
    s => !votes.value[s.discussion].find(v => v.statement === s.id)
  )
);
const results: ComputedRef<Statement[]> = computed(() =>
  statements.value.sort((a, b) => b.vote_count - a.vote_count)
);

onMounted(async () => {
  if (!discussion.value) {
    loading.value = true;

    await loadDiscussion(id);
    await loadVotes(id);

    loading.value = false;
    loaded.value = true;
  }
});

watch(
  () => web3.value.account,
  async () => {
    await loadVotes(id);
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

  await sendStatement(id, statement.value);

  statement.value = '';
  submitLoading.value = false;
}

const markdownBody = ref<HTMLElement | null>(null);

// Detect if the proposal body is too long and should be shortened
const truncateMarkdownBody = computed(() => {
  const markdownBodyHeight = markdownBody.value?.clientHeight
    ? markdownBody.value.clientHeight
    : 0;
  return markdownBodyHeight > 380;
});
</script>

<template>
  <div>
    <div v-if="loading" class="p-4">
      <UiLoading />
    </div>
    <div v-else-if="loaded && discussion">
      <div class="mb-6">
        <div class="pt-10 pb-6 bg-skin-border/20 border-b mb-5">
          <UiContainer class="!max-w-[740px]">
            <h1 class="leading-[1.1em]" v-text="discussion.title" />
          </UiContainer>
        </div>

        <UiContainer class="!max-w-[740px] s-box space-y-6">
          <UiMarkdown v-if="discussion.body" :body="discussion.body" />

          <div class="space-y-6">
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
                  v-model="statement"
                  :definition="STATEMENT_DEFINITION"
                  :required="true"
                  :disabled="submitLoading"
                />
                <div>
                  <UiButton
                    class="primary items-center flex space-x-1"
                    :disabled="submitLoading"
                    @click="handleSubmit"
                  >
                    <div>Publish</div>
                    <IH-paper-airplane class="rotate-90 relative left-[2px]" />
                  </UiButton>
                </div>
              </div>
            </div>

            <div v-if="discussion.statements.length > 0">
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
          </div>
        </UiContainer>
      </div>
    </div>
  </div>
</template>
