<script setup lang="ts">
import { client } from '@/helpers/kbyte';

interface Discussion {
  id: number;
  title: string;
  body: string;
  statement_count: number;
  vote_count: number;
}

const route = useRoute();

const id = route.params.id;

const discussion: Ref<Discussion | null> = ref(null);
const statements: Ref<any[]> = ref([]);
const loading = ref(false);
const loaded = ref(false);
const submitLoading = ref(false);
const statement = ref('');

onMounted(async () => {
  loading.value = true;

  discussion.value = await client.requestAsync('get_discussion', id);

  if (discussion.value && discussion.value.statement_count > 0) {
    statements.value = await client.requestAsync('get_statements', id);
  }

  loading.value = false;
  loaded.value = true;
});

const STATEMENT_DEFINITION = {
  type: 'string',
  format: 'long',
  title: 'Add a statement',
  minLength: 1,
  maxLength: 256
};

async function handleSubmit() {
  submitLoading.value = true;

  await client.requestAsync('broadcast', {
    type: 'statement',
    from: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
    sig: '0xf0e14ebfa7f08ee13811725e8171465f710decd56a1e4c67cffa99e2e51acf742ef326836affeb4c8c110e89818895acc24cb0893f4bae47eddbbd57138c6ca41b',
    payload: {
      author: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
      discussion: id,
      statement: statement.value
    }
  });

  statement.value = '';
  submitLoading.value = false;
}
</script>

<template>
  <div>
    <div v-if="loading" class="p-4">
      <UiLoading />
    </div>
    <div v-else-if="loaded && discussion">
      <div class="mb-6">
        <div class="py-6 bg-skin-border/20 border-b mb-5">
          <UiContainer class="!max-w-[740px]">
            <h1 class="leading-[1.1em]" v-text="discussion.title" />
          </UiContainer>
        </div>

        <UiContainer class="!max-w-[740px] s-box space-y-6">
          <UiMarkdown v-if="discussion.body" :body="discussion.body" />

          <div class="space-y-6">
            <div v-if="discussion.statement_count > 0">
              <h4 class="mb-3 eyebrow flex items-center gap-2">
                <IH-eye />
                Pending statement(s)
                <div
                  class="text-skin-link font-normal inline-block bg-skin-border text-[13px] rounded-full px-1.5"
                >
                  2
                </div>
              </h4>
              <PulseStatements />
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
                  First time here? Lorem ipsum dolor sit amet consectetur
                  adipisicing elit.
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

            <div v-if="discussion.statement_count > 0">
              <div class="mb-3 flex">
                <h4 class="eyebrow flex items-center gap-2 flex-1">
                  <IH-chart-square-bar />
                  Results
                </h4>
                <div>
                  Sort by:
                  <span class="text-skin-link">agree %</span>
                  <IH-arrow-sm-down class="inline-block ml-2" />
                </div>
              </div>
              <div class="space-y-3">
                <PulseStatementItem
                  v-for="(s, i) in statements"
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
