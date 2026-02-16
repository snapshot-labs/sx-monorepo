<script setup lang="ts">
import { compareAddresses } from '@/helpers/utils';
import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import { Space, Statement, User } from '@/types';
import ICAgora from '~icons/c/agora';
import ICKarmahq from '~icons/c/karmahq';
import ICTally from '~icons/c/tally';

const SOURCE_ICONS = {
  agora: { icon: ICAgora, link: 'https://www.agora.xyz' },
  karmahq: { icon: ICKarmahq, link: 'https://karmahq.xyz' },
  tally: { icon: ICTally, link: 'https://www.tally.xyz' }
};

const offchainNetworkId = offchainNetworks.filter(network =>
  enabledNetworks.includes(network)
)[0];
const offchainNetwork = getNetwork(offchainNetworkId);

const props = defineProps<{ user: User; space: Space }>();

const route = useRoute();
const { setTitle } = useTitle();
const { web3 } = useWeb3();

const isEditMode = ref(false);
const loading = ref(false);
const statement = ref<Statement | null>(null);

const userId = computed(() => route.params.user as string);
const shouldShowSource = computed(() => {
  if (!statement.value?.source) return false;

  return statement.value.source in SOURCE_ICONS;
});

async function loadStatement() {
  loading.value = true;

  try {
    statement.value = (await offchainNetwork.api.loadStatement(
      props.space.network,
      props.space.id,
      userId.value
    )) || {
      space: props.space.id,
      network: props.space.network,
      delegate: userId.value,
      about: '',
      statement: '',
      status: 'INACTIVE',
      discourse: '',
      source: null
    };
  } finally {
    loading.value = false;
  }
}

watch(userId, loadStatement, { immediate: true });

watchEffect(() =>
  setTitle(`${props.user.name || userId.value} ${props.space.name}'s profile`)
);
</script>

<template>
  <div class="p-4 pb-0">
    <UiLoading v-if="loading" class="block" />
    <template v-else-if="statement">
      <EditorStatement
        v-if="isEditMode"
        v-model="statement"
        @close="isEditMode = false"
      />
      <div v-else class="flex flex-col space-y-2.5">
        <div class="relative">
          <div
            class="inline-block border rounded-full pl-2 pr-[10px] pb-0.5 text-skin-heading"
          >
            <template v-if="statement.status === 'ACTIVE'">
              <IS-status-online
                class="text-skin-success inline-block size-[17px] mb-[1px]"
              />
              Active
            </template>
            <template v-else>
              <div
                class="size-[8px] mx-1 bg-gray-500 rounded-full inline-block"
              />
              Inactive
            </template>
          </div>
          <UiTooltip
            v-if="compareAddresses(web3.account, userId)"
            title="Edit"
            class="!absolute right-0"
          >
            <UiButton uniform @click="isEditMode = true">
              <IH-pencil />
            </UiButton>
          </UiTooltip>
        </div>
        <template v-if="statement.statement">
          <UiMarkdown
            class="text-skin-heading max-w-[592px]"
            :body="statement.statement"
          />
          <div v-if="shouldShowSource && statement.source">
            <UiEyebrow class="text-skin-text mb-2">Source</UiEyebrow>
            <AppLink
              :to="SOURCE_ICONS[statement.source].link"
              class="flex items-center"
            >
              <component
                :is="SOURCE_ICONS[statement.source].icon"
                class="max-h-[25px] max-w-[85px] w-auto"
              />
            </AppLink>
          </div>
        </template>
        <UiStateWarning v-else>
          This user does not have statement yet.
        </UiStateWarning>
      </div>
    </template>
    <UiStateWarning v-else> Failed to load statement. </UiStateWarning>
  </div>
</template>
