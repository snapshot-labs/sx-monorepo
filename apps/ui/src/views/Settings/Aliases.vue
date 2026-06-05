<script setup lang="ts">
import { isHexString } from '@ethersproject/bytes';
import { Wallet } from '@ethersproject/wallet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { ALIAS_EXPIRY_DAYS } from '@/helpers/constants';
import { isUserAbortError } from '@/helpers/utils';
import { getNetwork, metadataNetwork } from '@/networks';
import { useUiStore } from '@/stores/ui';
import { Alias } from '@/types';
import pkg from '../../../package.json';

useTitle('Aliases');

const { web3, web3Account, auth } = useWeb3();
const uiStore = useUiStore();
const queryClient = useQueryClient();

const network = getNetwork(metadataNetwork);
const queryKey = ['aliases', 'list', web3Account] as const;

const storedKeys = useStorage(
  `${pkg.name}.aliases`,
  {} as Record<string, string>
);

const localAliasAddress = computed(() => {
  const pk = web3Account.value && storedKeys.value[web3Account.value];
  if (!pk || !isHexString(pk)) return null;
  try {
    return new Wallet(pk).address.toLowerCase();
  } catch {
    return null;
  }
});

const { data: aliases, isPending } = useQuery({
  queryKey,
  queryFn: () => network.api.loadAliases(web3Account.value),
  enabled: () => !!web3Account.value
});

const {
  mutate: revoke,
  isPending: isRevoking,
  variables: revokingAlias
} = useMutation({
  mutationFn: async (alias: string) => {
    if (!auth.value) return;
    const envelope = await network.actions.revokeAlias(
      auth.value.provider,
      alias
    );
    await network.actions.send(envelope);
  },
  onSuccess: (_data, alias) => {
    queryClient.setQueryData<Alias[]>(queryKey, prev =>
      (prev ?? []).filter(a => a.alias.toLowerCase() !== alias.toLowerCase())
    );
    uiStore.addNotification('success', 'Alias revoked.');
  },
  onError: (err: any) => {
    if (isUserAbortError(err)) return;
    uiStore.addNotification('error', err?.message || 'Failed to revoke alias.');
  }
});

const loading = computed(
  () => web3.value.authLoading || (!!web3Account.value && isPending.value)
);

const EXPIRY_SECONDS = ALIAS_EXPIRY_DAYS * 24 * 60 * 60;
const now = useNow({ interval: 60_000 });

const aliasItems = computed(() => {
  const nowSec = now.value.getTime() / 1000;
  return (aliases.value ?? []).map(alias => {
    const expiresAt = alias.created ? alias.created + EXPIRY_SECONDS : 0;
    const isExpired = !!alias.created && nowSec >= expiresAt;
    return { ...alias, expiresAt, isExpired };
  });
});
</script>

<template>
  <div>
    <UiSectionHeader label="Aliases" />
    <div v-if="loading" class="flex items-center justify-center py-6">
      <UiLoading />
    </div>
    <template v-else>
      <div
        v-for="alias in aliasItems"
        :key="alias.alias"
        class="mx-4 py-3 border-b flex group"
      >
        <div class="flex-auto flex items-center min-w-0">
          <UiStamp :id="alias.alias" type="avatar" :size="32" />
          <div class="flex flex-col ml-3 leading-[22px] min-w-0 pr-2 md:pr-0">
            <div class="flex items-center gap-1.5 text-skin-link font-bold">
              <UiAddress :address="alias.alias" copy-button="always" />
              <UiTooltip
                v-if="alias.alias.toLowerCase() === localAliasAddress"
                title="Key available in this browser"
              >
                <IH-key class="size-[16px] text-skin-text" />
              </UiTooltip>
            </div>
            <TimeRelative
              v-if="alias.created"
              v-slot="{ relativeTime }"
              :time="alias.expiresAt"
              without-suffix
            >
              <span
                class="text-[17px]"
                :class="alias.isExpired ? 'text-skin-danger' : 'text-skin-text'"
              >
                {{
                  alias.isExpired
                    ? `Expired ${relativeTime} ago`
                    : `Expires in ${relativeTime}`
                }}
              </span>
            </TimeRelative>
          </div>
        </div>
        <UiButton
          class="!px-3 hover:border-skin-danger"
          :loading="isRevoking && revokingAlias === alias.alias"
          @click="revoke(alias.alias)"
        >
          <span class="text-skin-danger">Revoke</span>
        </UiButton>
      </div>
      <UiStateWarning v-if="!aliases?.length" class="px-4 py-3">
        You have no aliases.
      </UiStateWarning>
    </template>
  </div>
</template>
