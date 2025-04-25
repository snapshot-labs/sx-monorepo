<script setup lang="ts">
import { Discussion, Statement } from '@/helpers/townhall/types';

const props = defineProps<{
  discussion: Discussion;
  statements: Statement[];
}>();

const { web3 } = useWeb3();
const { sendVote, sendHideStatement, sendPinStatement } = useTownhall();
const { addNotification } = useUiStore();

const loading = ref(false);

async function handleHideStatement(statement: number) {
  loading.value = true;

  try {
    await sendHideStatement(parseInt(props.discussion.id), statement);
  } catch (e) {
    addNotification('error', e.message);
  }

  loading.value = false;
}

async function handlePinStatement(statement: number) {
  loading.value = true;

  try {
    await sendPinStatement(parseInt(props.discussion.id), statement);
  } catch (e) {
    addNotification('error', e.message);
  }

  loading.value = false;
}

async function handleVote(
  discussion: number,
  statement: number,
  choice: 1 | 2 | 3
) {
  loading.value = true;

  try {
    await sendVote(discussion, statement, choice);
  } catch (e) {
    addNotification('error', e.message);
  }

  loading.value = false;
}
</script>

<template>
  <div v-if="statements[0]">
    <div class="border rounded-md p-4 min-h-[220px] flex flex-col">
      <div class="text-lg text-skin-link flex-auto">
        <UiLoading v-if="loading" />
        <div v-else class="flex">
          <div class="flex-1 mb-4" v-text="statements[0].body" />
          <UiDropdown v-if="web3.account && discussion.author === web3.account">
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
                  @click="handlePinStatement(statements[0].statement_id)"
                >
                  <IC-pin class="w-[16px] h-[16px]" />
                  {{ statements[0].pinned ? 'Unpin' : 'Pin' }} statement
                </button>
              </UiDropdownItem>
              <UiDropdownItem v-slot="{ active }">
                <button
                  type="button"
                  class="flex items-center gap-2"
                  :class="{ 'opacity-80': active }"
                  :disabled="loading"
                  @click="handleHideStatement(statements[0].statement_id)"
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
          :disabled="loading"
          class="!border-skin-success !text-skin-success space-x-1"
          @click="
            handleVote(
              statements[0].discussion_id,
              statements[0].statement_id,
              1
            )
          "
        >
          <IH-check class="inline-block" />
          <span class="hidden sm:inline-block" v-text="'Agree'" />
        </UiButton>
        <UiButton
          :disabled="loading"
          class="!border-skin-danger !text-skin-danger space-x-1"
          @click="
            handleVote(
              statements[0].discussion_id,
              statements[0].statement_id,
              2
            )
          "
        >
          <IH-x class="inline-block" />
          <span class="hidden sm:inline-block" v-text="'Disagree'" />
        </UiButton>
        <UiButton
          :disabled="loading"
          class="!border-skin-text !text-skin-text space-x-1"
          @click="
            handleVote(
              statements[0].discussion_id,
              statements[0].statement_id,
              3
            )
          "
        >
          <IH-minus-sm class="inline-block" />
          <span class="hidden sm:inline-block" v-text="'Pass'" />
        </UiButton>
      </div>
    </div>
    <div class="h-4">
      <div v-if="statements[1]" class="mx-1">
        <div class="border border-t-0 rounded-b-md h-2" />
        <div v-if="statements[2]" class="mx-1">
          <div class="border border-t-0 rounded-b-md h-2" />
          <div v-if="statements[3]" class="mx-1">
            <div class="border border-t-0 rounded-b-md h-2" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
