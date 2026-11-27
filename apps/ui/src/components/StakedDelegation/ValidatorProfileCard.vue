<script setup lang="ts">
import {
  getStakedDelegationConfig,
  getValidator,
  getValidatorProfile,
  getValidators,
  isSameAddress,
  shortenVoter,
  totalStake,
  ValidatorConfig
} from '@/helpers/stakedVoteDelegation';
import { VotingRecord } from '@/helpers/stakedVoteDelegation/votingRecord';
import { _p, _vp, shortenAddress } from '@/helpers/utils';

const props = defineProps<{
  staker: string;
  config?: ValidatorConfig;
  record?: VotingRecord;
  isRecordLoading?: boolean;
}>();

const { explorerUrl } = getStakedDelegationConfig();
const { request: requestProfile, getProfile } = useSnapshotProfiles();
watch(() => props.staker, requestProfile, { immediate: true });

const validator = computed(() => getValidator(props.staker));
const curated = computed(() => getValidatorProfile(props.staker));
const snapshot = computed(() => getProfile(props.staker));

const displayName = computed(
  () =>
    curated.value?.name ||
    snapshot.value?.name ||
    validator.value?.name ||
    shortenAddress(props.staker)
);

const about = computed(() => curated.value?.about || snapshot.value?.about);
const links = computed(() => {
  const list: { label: string; url: string }[] = [];
  if (curated.value?.website) {
    list.push({
      label: curated.value.website.replace(/^https?:\/\//, ''),
      url: curated.value.website
    });
  }
  if (snapshot.value?.twitter) {
    list.push({
      label: `@${snapshot.value.twitter}`,
      url: `https://x.com/${snapshot.value.twitter}`
    });
  }
  if (snapshot.value?.github) {
    list.push({
      label: `github.com/${snapshot.value.github}`,
      url: `https://github.com/${snapshot.value.github}`
    });
  }
  return list;
});

function strk(wei: bigint | string) {
  return _vp(Number(BigInt(wei) / 10n ** 15n) / 1000);
}

const share = computed(() => {
  if (!validator.value) return null;
  const all = getValidators().reduce((sum, v) => sum + totalStake(v), 0n);
  return all > 0n
    ? Number((totalStake(validator.value) * 1_000_000n) / all) / 1e6
    : 0;
});

const stats = computed(() => {
  const v = validator.value;
  return [
    {
      label: 'Staking power',
      value: share.value !== null ? _p(share.value) : '—'
    },
    {
      label: 'Stake',
      value: v ? `${strk(totalStake(v))} STRK` : '—',
      detail: v ? `${strk(v.own)} self · ${strk(v.delegated)} delegated` : ''
    },
    {
      label: 'Commission',
      value: v?.commission != null ? `${v.commission / 100}%` : '—'
    },
    {
      label: 'Uptime · 30d',
      value: v?.liveness !== undefined ? _p(v.liveness, 1) : '—'
    }
  ];
});
</script>

<template>
  <div class="border rounded-lg">
    <div class="p-4 flex flex-col sm:flex-row gap-4">
      <UiStamp :id="staker" type="avatar" :size="64" class="shrink-0" />
      <div class="flex-1 min-w-0 flex flex-col gap-1.5">
        <div class="flex flex-wrap items-center gap-2">
          <h3
            class="text-skin-heading text-lg leading-7"
            v-text="displayName"
          />
          <UiTooltip
            v-if="curated?.verified"
            title="Profile verified by the Starknet Foundation"
          >
            <IS-badge-check class="size-[18px] text-skin-link" />
          </UiTooltip>
          <UiPill v-if="validator?.exiting">Exiting</UiPill>
        </div>
        <AppLink
          :to="`${explorerUrl}/contract/${staker}`"
          class="text-skin-text text-[15px] flex items-center gap-1 self-start hover:text-skin-link"
        >
          {{ shortenAddress(staker) }}
          <IH-arrow-sm-right class="-rotate-45" />
        </AppLink>
        <p
          v-if="about"
          class="text-skin-text text-[16px] leading-6 max-w-[720px] whitespace-pre-line break-words"
          v-text="about"
        />
        <p v-else class="text-skin-text text-[15px] italic">
          This validator has not published a profile yet.
        </p>
        <div v-if="links.length" class="flex flex-wrap gap-x-3 gap-y-1">
          <AppLink
            v-for="link in links"
            :key="link.url"
            :to="link.url"
            class="text-skin-link text-[15px] flex items-center gap-0.5"
          >
            {{ link.label }}
            <IH-arrow-sm-right class="-rotate-45" />
          </AppLink>
        </div>
      </div>
      <UiButton
        :to="`${explorerUrl}/staking?validator=${staker}`"
        primary
        class="shrink-0 self-start"
      >
        Stake
      </UiButton>
    </div>

    <div class="border-t grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="px-4 py-3 border-b md:border-r"
      >
        <UiEyebrow class="text-skin-text">{{ stat.label }}</UiEyebrow>
        <div class="text-skin-heading text-md" v-text="stat.value" />
        <div
          v-if="stat.detail"
          class="text-skin-text text-[14px]"
          v-text="stat.detail"
        />
      </div>
      <div class="px-4 py-3 border-b md:border-r">
        <UiEyebrow class="text-skin-text">Governance record</UiEyebrow>
        <div class="pt-1">
          <StakedDelegationRecordDots
            :record="record"
            :is-loading="isRecordLoading"
          />
        </div>
      </div>
      <div class="px-4 py-3">
        <UiEyebrow class="text-skin-text">Default delegations</UiEyebrow>
        <UiLoading v-if="!config" class="mt-1" />
        <template v-else>
          <div class="text-skin-heading text-md">
            {{ config.acceptsDefaultDelegations ? 'Accepting' : 'Declined' }}
          </div>
          <div
            v-if="!isSameAddress(config.voteReceiver, staker)"
            class="text-skin-text text-[14px] truncate"
          >
            Votes via {{ shortenVoter(config.voteReceiver) }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
