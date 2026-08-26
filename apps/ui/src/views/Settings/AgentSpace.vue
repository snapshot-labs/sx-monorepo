<script setup lang="ts">
import { _n } from '@/helpers/utils';
import { metadataNetwork } from '@/networks';
import {
  useAgentContextsQuery,
  useSaveAgentContextMutation
} from '@/queries/agent';
import { useSpaceQuery } from '@/queries/spaces';

const CONTEXT_DEFINITION = {
  type: 'string',
  title: 'Voting Context',
  maxLength: 5000,
  examples: ['e.g. approve routine renewals under $1000 a month']
};

const route = useRoute();
const { web3 } = useWeb3();
const {
  wallet: aliasWallet,
  isRegistered,
  isCheckingAlias,
  isAuthenticating,
  authenticate
} = useAliasWallet();

const spaceId = computed(() => String(route.params.space ?? ''));

const { setTitle } = useTitle('Agentic Voting');

const { data: space, isLoading: isLoadingSpace } = useSpaceQuery({
  networkId: metadataNetwork,
  spaceId
});
const { data: contexts, isLoading: isLoadingContexts } = useAgentContextsQuery(
  () => (isRegistered.value ? aliasWallet.value : null)
);
const {
  mutate: saveContext,
  isPending: isSaving,
  error: saveError
} = useSaveAgentContextMutation(aliasWallet);

const savedContext = computed(
  () => contexts.value?.find(row => row.space === spaceId.value)?.context ?? ''
);

const draft = ref('');
const isTouched = ref(false);

watch(
  savedContext,
  value => {
    if (!isTouched.value) draft.value = value;
  },
  { immediate: true }
);

const isDirty = computed(() => draft.value !== savedContext.value);

const isLoading = computed(
  () =>
    web3.value.authLoading ||
    isLoadingSpace.value ||
    isCheckingAlias.value ||
    isLoadingContexts.value
);

watchEffect(() => {
  if (space.value) setTitle(`Agentic Voting - ${space.value.name}`);
});

const el = ref(null);
const { height: toolbarHeight } = useElementSize(el);

function save(): void {
  saveContext({ space: spaceId.value, context: draft.value });
  isTouched.value = false;
}

function reset(): void {
  draft.value = savedContext.value;
  isTouched.value = false;
}
</script>

<template>
  <div :style="`min-height: calc(100vh - ${toolbarHeight + 73}px)`">
    <UiLoading v-if="isLoading" class="px-4 py-4 block" />
    <UiStateWarning v-else-if="!space" class="px-4 py-3">
      This space could not be loaded.
    </UiStateWarning>
    <template v-else>
      <div class="px-4 py-3">
        <AppLink
          :to="{ name: 'settings-agent' }"
          class="flex items-center gap-1 text-skin-text w-fit"
        >
          <IH-arrow-narrow-left class="size-[16px] shrink-0" />
          Agentic Voting
        </AppLink>
      </div>
      <div
        class="relative h-[156px] md:h-[140px] mb-[-86px] md:mb-[-70px] top-[-1px]"
      >
        <div class="size-full overflow-hidden">
          <SpaceCover :space="space" />
        </div>
        <div
          class="relative bg-skin-bg h-[16px] -top-3 rounded-t-[16px] md:hidden"
        />
        <div class="absolute right-4 top-4">
          <UiTooltip title="View space">
            <UiButton
              :to="{
                name: 'space-overview',
                params: { space: `${space.network}:${space.id}` }
              }"
              uniform
            >
              <IH-arrow-sm-right />
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
          <div class="flex items-center">
            <h1 v-text="space.name" />
            <UiBadgeSpace
              class="ml-1 top-0.5"
              :verified="space.verified"
              :turbo="space.turbo"
              :flagged="space.additionalRawData?.flagged || false"
            />
          </div>
          <div class="flex flex-wrap gap-x-1 items-center">
            <div>
              <b class="text-skin-link">{{ _n(space.proposal_count) }}</b>
              proposals
            </div>
            <div>·</div>
            <div>
              <b class="text-skin-link">{{
                _n(space.vote_count, 'compact')
              }}</b>
              votes
            </div>
            <div>·</div>
            <div>
              <b class="text-skin-link">
                {{ _n(space.follower_count, 'compact') }}
              </b>
              followers
            </div>
          </div>
        </div>
      </div>

      <div class="px-4 pb-3 max-w-[592px] space-y-3">
        <div
          v-if="!isRegistered"
          class="border rounded-lg px-4 py-8 flex flex-col items-center gap-3 text-center"
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
          <div class="s-box">
            <UiTextarea
              :model-value="draft"
              :definition="CONTEXT_DEFINITION"
              class="!min-h-[200px]"
              @update:model-value="
                draft = $event ?? '';
                isTouched = true;
              "
            />
          </div>

          <UiAlert v-if="saveError" type="error">
            {{ saveError.message }}
          </UiAlert>
        </template>
      </div>
    </template>
  </div>
  <SettingsToolbar
    v-if="isRegistered && isDirty"
    ref="el"
    :error="null"
    :is-modified="isDirty"
    :saving="isSaving"
    @save="save"
    @reset="reset"
  />
</template>
