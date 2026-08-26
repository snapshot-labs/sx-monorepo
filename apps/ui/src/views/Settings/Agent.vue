<script setup lang="ts">
import { ALIAS_AVAILABILITY_PERIOD } from '@/composables/useAlias';
import { isAgentVotingAvailable } from '@/helpers/agent';
import { _n } from '@/helpers/utils';
import { metadataNetwork } from '@/networks';
import { useAgentContextsQuery, useAgentInfoQuery } from '@/queries/agent';
import { useSpacesByIdsQuery } from '@/queries/spaces';
import { Space } from '@/types';

const AUTHORIZATION_DAYS = ALIAS_AVAILABILITY_PERIOD / (60 * 60 * 24);

type SpaceStatus = { label: string; isEnabled: boolean };

useTitle('Agentic Voting');

const { web3 } = useWeb3();
const {
  wallet: aliasWallet,
  isRegistered,
  isCheckingAlias: isCheckingAliasWallet,
  isAuthenticating,
  authenticate
} = useAliasWallet();

const { data: agent, isPending: isLoadingAgent, isError } = useAgentInfoQuery();
const { data: contexts, isError: isContextsError } = useAgentContextsQuery(
  () => (isRegistered.value ? aliasWallet.value : null)
);

const { data: spaces } = useSpacesByIdsQuery({
  ids: () => agent.value?.spaces.map(id => `${metadataNetwork}:${id}`)
});

const {
  isAuthorizing,
  isRevoking,
  error,
  isAlreadyAuthorized,
  isCheckingAlias,
  expiresAt,
  isExpired,
  authorize,
  revoke
} = useAliasAuthorize(() => agent.value?.signer ?? '');

const isLoading = computed(
  () =>
    web3.value.authLoading ||
    isLoadingAgent.value ||
    isCheckingAlias.value ||
    isCheckingAliasWallet.value
);
const isEnabled = computed(() => isAlreadyAuthorized.value && !isExpired.value);

function getSpaceStatus(space: Space): SpaceStatus | null {
  if (!contexts.value) return null;

  const hasContext = contexts.value.some(
    row => row.space === space.id && row.context.trim()
  );

  if (!hasContext) return { label: 'No context', isEnabled: false };

  return isEnabled.value
    ? { label: 'Enabled', isEnabled: true }
    : { label: 'Paused', isEnabled: false };
}
</script>

<template>
  <div>
    <UiStateWarning v-if="!isAgentVotingAvailable" class="px-4 py-3">
      Agentic Voting is not available.
    </UiStateWarning>
    <template v-else>
      <div class="px-4 pt-4 max-w-[592px]">
        <h3>Agentic Voting</h3>
        <span class="inline-block">
          Let a Snapshot agent vote on proposals for you.
        </span>
      </div>

      <UiLoading v-if="isLoading" class="px-4 py-4 block" />
      <UiStateWarning v-else-if="isError || !agent" class="px-4 py-3">
        The agent is unreachable, try again later.
      </UiStateWarning>
      <div
        v-else-if="!isRegistered"
        class="border rounded-lg mx-4 mt-4 max-w-[592px] px-4 py-8 flex flex-col items-center gap-3 text-center"
      >
        <IH-lock-closed class="size-[24px]" />
        <div class="space-y-1">
          <h4 class="text-skin-heading">Authenticate your account</h4>
          <div class="text-sm leading-[18px] max-w-[360px]">
            Verify your account once to use Agentic Voting.
          </div>
        </div>
        <UiButton primary :loading="isAuthenticating" @click="authenticate()">
          Authenticate
        </UiButton>
      </div>
      <template v-else>
        <UiSectionHeader class="mt-4" label="Status" />
        <div v-if="!isEnabled" class="px-4 py-3 max-w-[592px]">
          <span class="inline-block">
            Enabling asks for a signature that lets the agent vote from your
            account for {{ AUTHORIZATION_DAYS }} days. You can disable it at any
            time.
          </span>
        </div>
        <div class="mx-4 py-3 flex items-center gap-3">
          <div
            class="size-[32px] shrink-0 rounded-full border flex items-center justify-center"
          >
            <IH-sparkles class="size-[16px]" />
          </div>
          <div class="grow flex flex-col leading-[22px] min-w-0">
            <span class="text-skin-link font-bold">Snapshot agent</span>
            <TimeRelative
              v-if="isEnabled"
              v-slot="{ relativeTime }"
              :time="expiresAt"
              without-suffix
            >
              <span class="text-[17px]"
                >Enabled, expires in {{ relativeTime }}</span
              >
            </TimeRelative>
            <span v-else-if="isExpired" class="text-[17px] text-skin-danger">
              Authorization expired
            </span>
            <span v-else class="text-[17px]">Not enabled</span>
          </div>
          <UiButton
            v-if="isEnabled"
            class="!px-3 hover:border-skin-danger"
            :loading="isRevoking"
            @click="revoke()"
          >
            <span class="text-skin-danger">Disable</span>
          </UiButton>
          <UiButton
            v-else
            primary
            :loading="isAuthorizing"
            @click="authorize()"
          >
            {{ isExpired ? 'Renew' : 'Enable' }}
          </UiButton>
        </div>

        <UiAlert v-if="error" type="error" class="mx-4 mb-3">
          {{ error }}
        </UiAlert>

        <UiSectionHeader label="Spaces" />
        <UiStateWarning v-if="isContextsError && !contexts" class="px-4 py-3">
          Your voting contexts could not be loaded, try again later.
        </UiStateWarning>
        <UiStateWarning v-else-if="!spaces?.length" class="px-4 py-3">
          Agentic Voting is not supported in any space yet.
        </UiStateWarning>
        <template v-else>
          <UiColumnHeader class="hidden md:flex text-center">
            <div class="grow" />
            <div class="w-[130px]" v-text="'Status'" />
            <div class="w-[100px]" v-text="'Proposals'" />
            <div class="w-[100px]" v-text="'Followers'" />
          </UiColumnHeader>
          <SpacesListItem
            v-for="space in spaces"
            :key="`${space.network}:${space.id}`"
            :space="space"
            :to="{ name: 'settings-agent-space', params: { space: space.id } }"
          >
            <template #details>
              <div class="flex text-center -ml-3">
                <span
                  class="w-[130px]"
                  :class="
                    getSpaceStatus(space)?.isEnabled ? 'text-skin-success' : ''
                  "
                  v-text="getSpaceStatus(space)?.label"
                />
                <span
                  class="text-[21px] font-bold text-skin-link w-[100px] hidden md:block"
                  v-text="_n(space.proposal_count, 'compact')"
                />
                <span
                  class="text-[21px] font-bold text-skin-link w-[100px] hidden md:block"
                  v-text="_n(space.follower_count, 'compact')"
                />
              </div>
            </template>
          </SpacesListItem>
        </template>
      </template>
    </template>
  </div>
</template>
