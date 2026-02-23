<script setup lang="ts">
import { shorten } from '@/helpers/utils';
import { useAgentDetailQuery } from '@/queries/agents';

const route = useRoute();

const agentAddress = computed(
  () => (route.params.agentAddress as string) || ''
);

const { data, isPending } = useAgentDetailQuery(agentAddress);

useTitle('Agent');

const placeholderActivity = [
  {
    id: '1',
    space: 'fabien.eth',
    proposal: 'Increase treasury diversification to 30% stablecoins',
    choice: 'For',
    reason:
      'This proposal aligns with conservative treasury management. Increasing stablecoin allocation reduces volatility exposure and ensures the DAO can meet obligations during market downturns.',
    date: '2 hours ago'
  },
  {
    id: '2',
    space: 'fabien.eth',
    proposal: 'Fund marketing campaign Q3 2026',
    choice: 'Against',
    reason:
      'The budget lacks clear KPIs and measurable outcomes. Without defined success metrics, approving 150k from the treasury poses unnecessary risk. I recommend resubmitting with a detailed ROI framework.',
    date: '1 day ago'
  },
  {
    id: '3',
    space: 'fabien.eth',
    proposal: 'Migrate governance to Snapshot X',
    choice: 'For',
    reason:
      'On-chain governance improves transparency and reduces reliance on trusted intermediaries. The migration plan is well-structured with a clear timeline and rollback strategy.',
    date: '3 days ago'
  }
];
</script>

<template>
  <div>
    <div class="flex items-center justify-between p-4">
      <UiButton :to="{ name: 'settings-agents' }" uniform>
        <IH-arrow-narrow-left />
      </UiButton>
      <UiDropdown v-if="data">
        <template #button>
          <UiButton uniform>
            <IH-dots-horizontal />
          </UiButton>
        </template>
        <template #items>
          <UiDropdownItem
            :to="{
              name: 'settings-agent-edit',
              params: { agentAddress: data.agent_address }
            }"
          >
            <IH-pencil :width="16" />
            Edit agent
          </UiDropdownItem>
          <UiDropdownItem>
            <IH-pause :width="16" />
            Pause agent
          </UiDropdownItem>
          <UiDropdownItem class="!text-skin-danger">
            <IH-trash :width="16" />
            Delete agent
          </UiDropdownItem>
        </template>
      </UiDropdown>
    </div>
    <div class="flex items-center px-4 pb-4">
      <div v-if="data" class="flex items-center gap-3 min-w-0">
        <UiStamp :id="data.agent_address" type="avatar" :size="32" />
        <div class="min-w-0">
          <h3 class="truncate" v-text="data.name || 'Unnamed agent'" />
          <span
            class="text-skin-text text-sm"
            v-text="shorten(data.agent_address)"
          />
        </div>
      </div>
    </div>
    <UiSectionHeader label="Spaces" sticky />
    <UiLoading v-if="isPending" class="px-4 py-3 block" />
    <template v-else-if="data">
      <template v-if="data.contexts.length">
        <div
          v-for="ctx in data.contexts"
          :key="ctx.space_id"
          class="mx-4 border-b py-[18px] flex items-center space-x-3"
        >
          <UiStamp
            :id="`s:${ctx.space_id}`"
            type="space"
            :size="32"
            class="!rounded-[4px] shrink-0"
          />
          <div class="grow min-w-0">
            <h3 class="truncate" v-text="ctx.space_id" />
            <span
              v-if="ctx.context"
              class="text-skin-text text-sm truncate block"
              v-text="ctx.context"
            />
          </div>
        </div>
      </template>
      <UiStateWarning v-else class="px-4 py-3">
        No spaces configured.
      </UiStateWarning>
    </template>
    <UiStateWarning v-else class="px-4 py-3">
      Agent not found.
    </UiStateWarning>

    <template v-if="data">
      <div class="py-3" />
      <UiSectionHeader label="Activity" sticky />
      <div
        v-for="item in placeholderActivity"
        :key="item.id"
        class="mx-4 border-b py-[18px]"
      >
        <div class="flex items-center space-x-3 mb-2">
          <UiStamp
            :id="`s:${item.space}`"
            type="space"
            :size="28"
            class="!rounded-[4px] shrink-0"
          />
          <div class="grow min-w-0">
            <h4 class="truncate" v-text="item.proposal" />
            <span class="text-skin-text text-sm" v-text="item.date" />
          </div>
          <span
            class="shrink-0 text-sm font-semibold"
            :class="
              item.choice === 'For'
                ? 'text-skin-success'
                : 'text-skin-danger'
            "
            v-text="item.choice"
          />
        </div>
        <p class="text-skin-text text-sm leading-5" v-text="item.reason" />
      </div>
    </template>
  </div>
</template>
