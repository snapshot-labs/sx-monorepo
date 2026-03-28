<script setup lang="ts">
import { useQueries, useQueryClient } from '@tanstack/vue-query';
import {
  _n,
  autoLinkText,
  getSocialNetworksLink,
  SOCIAL_NETWORKS
} from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
import {
  getProposals,
  PROPOSALS_KEYS,
  PROPOSALS_SUMMARY_LIMIT,
  setProposalsDetails
} from '@/queries/proposals';

const { setTitle } = useTitle();
const { isWhiteLabel } = useWhiteLabel();
const { organization } = useOrganization();
const queryClient = useQueryClient();
const proposalQueries = useQueries({
  queries: computed(() =>
    (organization.value?.spaces ?? []).map(s => ({
      queryKey: PROPOSALS_KEYS.spaceSummary(s.network, s.id),
      queryFn: async () => {
        const proposals = await getProposals([s.id], s.network, {
          limit: PROPOSALS_SUMMARY_LIMIT,
          skip: 0
        });
        setProposalsDetails(queryClient, s.network, proposals);
        return proposals;
      }
    }))
  )
});

const space = computed(() => organization.value?.spaces[0]);
const spaces = computed(() => organization.value?.spaces ?? []);

const totalProposalCount = computed(() =>
  spaces.value.reduce((sum, s) => sum + s.proposal_count, 0)
);

const totalVoteCount = computed(() =>
  spaces.value.reduce((sum, s) => sum + s.vote_count, 0)
);

const hasOffchainSpace = computed(() =>
  spaces.value.some(s => offchainNetworks.includes(s.network))
);

const totalFollowerCount = computed(() =>
  spaces.value.reduce((sum, s) => sum + (s.follower_count ?? 0), 0)
);

const socials = computed(() => {
  const merged: Record<string, string> = {};
  for (const { key } of SOCIAL_NETWORKS) {
    for (const s of spaces.value) {
      const value = (s as Record<string, any>)[key];
      if (value) {
        merged[key] = value;
        break;
      }
    }
  }
  return getSocialNetworksLink(merged);
});

const isPending = computed(() => proposalQueries.value.some(q => q.isPending));

const isError = computed(
  () => !isPending.value && proposalQueries.value.every(q => q.isError)
);

const proposals = computed(() =>
  proposalQueries.value
    .flatMap(q => q.data ?? [])
    .sort((a, b) => b.created - a.created)
    .slice(0, PROPOSALS_SUMMARY_LIMIT)
);

watchEffect(() => {
  if (space.value) setTitle(space.value.name);
});
</script>

<template>
  <div v-if="space">
    <div
      class="relative h-[156px] md:h-[140px] mb-[-86px] md:mb-[-70px] top-[-1px]"
    >
      <div class="size-full overflow-hidden">
        <SpaceCover :space="space" />
      </div>
      <div
        class="relative bg-skin-bg h-[16px] -top-3 rounded-t-[16px] md:hidden"
      />
      <div class="absolute right-4 top-4 flex gap-2">
        <UiTooltip title="New proposal">
          <UiButton
            :to="{
              name: 'space-editor',
              params: { space: `${space.network}:${space.id}` }
            }"
            uniform
          >
            <IH-pencil-alt />
          </UiButton>
        </UiTooltip>
      </div>
    </div>
    <div class="px-4">
      <div class="mb-4 relative">
        <SpaceAvatar
          :space="space"
          :size="90"
          class="relative mb-2 border-4 border-skin-bg !rounded-lg -left-1"
        />
        <div class="flex items-center gap-1">
          <h1 data-testid="space-name" v-text="space.name" />
          <UiBadgeSpace
            v-if="!isWhiteLabel"
            class="top-0.5"
            :verified="space.verified"
            :turbo="space.turbo"
            :flagged="space.additionalRawData?.flagged || false"
          />
        </div>
        <div class="mb-3 flex flex-wrap gap-x-1 items-center">
          <div>
            <b class="text-skin-link">{{ _n(totalProposalCount) }}</b>
            proposals
          </div>
          <div>·</div>
          <div>
            <b class="text-skin-link">{{ _n(totalVoteCount, 'compact') }}</b>
            votes
          </div>
          <template v-if="hasOffchainSpace">
            <div>·</div>
            <div>
              <b class="text-skin-link">
                {{ _n(totalFollowerCount, 'compact') }}
              </b>
              followers
            </div>
          </template>
        </div>
        <div
          v-if="space.about"
          class="max-w-[540px] text-skin-link text-md leading-[26px] mb-3 break-words"
          v-html="autoLinkText(space.about)"
        />
        <div v-if="socials.length > 0" class="gap-x-2 flex">
          <AppLink
            v-for="social in socials"
            :key="social.key"
            :to="social.href"
            class="text-skin-text hover:text-skin-link"
          >
            <component :is="social.icon" class="size-[26px]" />
          </AppLink>
        </div>
      </div>
    </div>
    <ProposalsList
      data-testid="summary-proposals-list"
      title="Proposals"
      :is-error="isError"
      :loading="isPending"
      :limit="PROPOSALS_SUMMARY_LIMIT"
      :proposals="proposals"
    />
  </div>
</template>
