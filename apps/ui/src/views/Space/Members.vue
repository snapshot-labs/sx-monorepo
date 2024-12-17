<script setup lang="ts">
import removeMarkdown from 'remove-markdown';
import { getNames } from '@/helpers/stamp';
import { shorten } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { addNotification } = useUiStore();
const { setTitle } = useTitle();

const loaded = ref(false);
const roles = ref<{ data: string[]; label: string }[]>([]);
const names = ref<Record<string, string>>({});
const statements = ref<Record<string, string>>({});
const abouts = ref<Record<string, string>>({});
const network = computed(() => getNetwork(props.space.network));

const admins = props.space.additionalRawData?.admins || [];
const moderators = props.space.additionalRawData?.moderators || [];
const authors = props.space.additionalRawData?.members || [];

async function loadMembersData() {
  try {
    const controller = await network.value.helpers
      .getSpaceController(props.space)
      .then(c => c.toLowerCase());

    const allUsers = [controller, ...admins, ...moderators, ...authors].map(u =>
      u.toLowerCase()
    );

    names.value = await getNames(allUsers);

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

    roles.value = [
      { data: [controller], label: 'Controller' },
      { data: admins, label: 'Admin(s)' },
      { data: moderators, label: 'Moderator(s)' },
      { data: authors, label: 'Authors(s)' }
    ] as const;

    loaded.value = true;
  } catch (e) {
    addNotification('error', 'Failed to load members data.');
    loaded.value = true;
  }
}
watchEffect(() => setTitle(`Members - ${props.space.name}`));

onMounted(loadMembersData);
</script>

<template>
  <div>
    <div v-if="!loaded" class="px-4 py-4 block">
      <UiLoading class="block" />
    </div>
    <template v-for="role in roles" v-else :key="role.label">
      <UiLabel v-if="role.data?.length" :label="role.label" />
      <div class="text-left table-fixed w-full">
        <div
          v-for="(user, i) in role.data"
          :key="`${role.label}-${i}`"
          class="border-b flex space-x-1"
        >
          <div
            class="flex items-center pl-4 py-3 gap-x-3 leading-[22px] min-w-[220px] truncate"
          >
            <UiStamp :id="user" :size="32" />
            <AppLink
              :to="{
                name: 'space-user-statement',
                params: { space: `${space.network}:${space.id}`, user: user }
              }"
              class="overflow-hidden"
            >
              <h4
                class="text-skin-link truncate"
                v-text="names[user] || shorten(user)"
              />
              <div
                class="text-[17px] text-skin-text truncate"
                v-text="shorten(user)"
              />
            </AppLink>
          </div>
          <div
            class="hidden sm:flex items-center grow text-[17px] px-4 overflow-hidden leading-[22px] text-skin-text"
          >
            <span
              v-if="statements[user] || abouts[user]"
              class="line-clamp-2 max-h-[44px]"
            >
              {{
                shorten(removeMarkdown(statements[user] || abouts[user]), 250)
              }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
