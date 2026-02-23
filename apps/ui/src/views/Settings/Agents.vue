<script setup lang="ts">
import { _n } from '@/helpers/utils';
import { useAgentsByUserQuery } from '@/queries/agents';

useTitle('Agents');

const { web3, web3Account } = useWeb3();

const { data, isPending } = useAgentsByUserQuery(
  toRef(() => web3Account.value)
);

const loading = computed(
  () => (web3Account.value && isPending.value) || web3.value.authLoading
);
</script>

<template>
  <div>
    <div class="flex justify-end p-4">
      <UiTooltip title="New agent">
        <UiButton :to="{ name: 'settings-agents-new' }" uniform>
          <IH-plus-sm />
        </UiButton>
      </UiTooltip>
    </div>
    <UiSectionHeader label="Agents" sticky />
    <UiColumnHeader class="hidden md:flex text-center">
      <div class="grow" />
      <div class="w-[160px] text-left">Spaces</div>
      <div class="w-[100px]">Votes</div>
    </UiColumnHeader>
    <UiLoading v-if="loading" class="px-4 py-3 block" />
    <template v-else-if="data?.length">
      <router-link
        v-for="agent in data"
        :key="agent.id"
        :to="{
          name: 'settings-agent-detail',
          params: { agentAddress: agent.agent_address }
        }"
        class="text-skin-text mx-4 group overflow-hidden flex border-b items-center py-[18px] space-x-3"
      >
        <div class="grow flex items-center min-w-0">
          <UiStamp
            :id="agent.agent_address"
            type="avatar"
            :size="32"
            class="mr-2.5 shrink-0"
          />
          <h3 class="truncate" v-text="agent.name || 'Unnamed agent'" />
        </div>
        <div class="text-[21px] font-bold flex text-center">
          <span
            class="w-[160px] hidden md:flex items-center justify-start gap-1.5"
          >
            <UiStamp
              v-for="ctx in agent.contexts"
              :key="ctx.space_id"
              :id="`s:${ctx.space_id}`"
              type="space"
              :size="28"
              class="!rounded-[4px]"
            />
          </span>
          <span class="text-skin-link w-[100px] hidden md:block">
            {{ _n(agent.vote_count, 'compact') }}
          </span>
        </div>
      </router-link>
    </template>
    <UiStateWarning v-else class="px-4 py-3">
      There are no agents here.
    </UiStateWarning>
  </div>
</template>
