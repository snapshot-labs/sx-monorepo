<script setup lang="ts">
import { _n, autoLinkText, getSocialNetworksLink } from '@/helpers/utils';
import { offchainNetworks } from '@/networks';
import {
  PROPOSALS_SUMMARY_LIMIT,
  useProposalsSummaryQuery
} from '@/queries/proposals';

const { setTitle } = useTitle();
const { isWhiteLabel } = useWhiteLabel();
const { organization } = useOrganization();

const space = computed(() => organization.value?.spaces[0]);

const isOffchainSpace = computed(
  () => space.value && offchainNetworks.includes(space.value.network)
);

const socials = computed(() =>
  space.value ? getSocialNetworksLink(space.value) : []
);

const { data, isPending, isError } = useProposalsSummaryQuery(
  toRef(() => space.value!.network),
  toRef(() => space.value!.id),
  toRef(() => !!space.value)
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
            <b class="text-skin-link">{{ _n(space.proposal_count) }}</b>
            proposals
          </div>
          <div>·</div>
          <div>
            <b class="text-skin-link">{{ _n(space.vote_count, 'compact') }}</b>
            votes
          </div>
          <template v-if="isOffchainSpace">
            <div>·</div>
            <div>
              <b class="text-skin-link">
                {{ _n(space.follower_count, 'compact') }}
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
      :limit="PROPOSALS_SUMMARY_LIMIT - 1"
      :proposals="data ?? []"
      :route="{
        name: 'space-proposals',
        params: { space: `${space.network}:${space.id}` },
        linkTitle: 'See more'
      }"
    />
  </div>
</template>
