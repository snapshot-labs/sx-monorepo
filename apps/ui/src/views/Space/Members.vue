<script setup lang="ts">
import removeMarkdown from 'remove-markdown';
import { shorten } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { addNotification } = useUiStore();
const { setTitle } = useTitle();

const loaded = ref(false);
const controller = ref<string>('');
const statements = ref<Record<string, string>>({});
const abouts = ref<Record<string, string>>({});
const network = computed(() => getNetwork(props.space.network));

const admins = props.space.additionalRawData?.admins || [];
const moderators = props.space.additionalRawData?.moderators || [];
const authors = props.space.additionalRawData?.members || [];

async function loadMembersData() {
  try {
    controller.value = await network.value.helpers
      .getSpaceController(props.space)
      .then(c => c.toLowerCase());

    const allUsers = [...admins, ...moderators, ...authors].map(u =>
      u.toLowerCase()
    );

    if (!allUsers.length) return;

    const { statements: userStatements, users } =
      await network.value.api.loadStatementsAndUsers(
        props.space.network,
        props.space.id,
        allUsers
      );

    statements.value = userStatements.reduce(
      (acc, statement) => {
        acc[statement.delegate.toLowerCase()] = statement.statement;
        return acc;
      },
      {} as Record<string, string>
    );

    abouts.value = users.reduce(
      (acc, user) => {
        acc[user.id.toLowerCase()] = user.about || '';
        return acc;
      },
      {} as Record<string, string>
    );

    loaded.value = true;
  } catch (e) {
    addNotification('error', 'Failed to load members data.');
    loaded.value = true;
  }
}
watchEffect(() => setTitle(`Memebers - ${props.space.name}`));

onMounted(loadMembersData);

const roles = [
  { data: admins, label: 'Admin(s)' },
  { data: moderators, label: 'Moderator(s)' },
  { data: authors, label: 'Authors(s)' }
] as const;
</script>

<template>
  <template v-for="role in roles" :key="role.label">
    <UiLabel v-if="role.data?.length" :label="role.label" />
    <div
      v-for="(user, i) in role.data"
      :key="`${role.label}-${i}`"
      class="border-b flex space-x-1"
    >
      <div
        class="flex items-center pl-4 py-3 gap-x-3 leading-[22px] min-w-[200px] truncate"
      >
        <UiStamp :id="user" :size="32" />
        <AppLink
          :to="{
            name: 'space-user-statement',
            params: { space: `${space.network}:${space.id}`, user: user }
          }"
          class="overflow-hidden"
        >
          <div
            class="text-[17px] text-skin-heading truncate"
            v-text="shorten(user)"
          />
          <div
            v-if="user === controller"
            class="rounded-full w-fit shrink-0 flex bg-orange-500 text-white"
          >
            <span class="text-sm leading-[10px] px-2 py-[4px]">
              Controller
            </span>
          </div>
        </AppLink>
      </div>
      <div
        class="hidden sm:flex items-center grow text-[17px] overflow-hidden leading-[22px] text-skin-text"
      >
        <UiLoading v-if="!loaded" class="px-4 py-3 block" />
        <span
          v-else-if="statements[user] || abouts[user]"
          class="line-clamp-2 max-h-[44px]"
        >
          {{ shorten(removeMarkdown(statements[user] || abouts[user]), 250) }}
        </span>
      </div>
    </div>
  </template>
</template>
