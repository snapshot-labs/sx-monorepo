<script setup lang="ts">
import { _rt } from '@/helpers/utils';

const notificationsStore = useNotificationsStore();
const { setTitle } = useTitle();

watchEffect(async () => {
  setTitle(
    `Notifications${notificationsStore.unreadNotificationsCount ? ` (${notificationsStore.unreadNotificationsCount} unread)` : ''}`
  );
});

watch(
  () => notificationsStore.unreadNotificationsCount,
  () => {
    notificationsStore.refreshLastUnreadTs();
  },
  { immediate: true }
);

onUnmounted(() => notificationsStore.markAllAsRead());
</script>

<template>
  <div>
    <UiLabel :label="'Notifications'" sticky />
    <UiLoading v-if="notificationsStore.loading" class="block px-4 py-3" />
    <div v-else-if="notificationsStore.notifications.length">
      <div
        v-for="(notification, i) in notificationsStore.notifications"
        :key="i"
      >
        <div
          class="border-b px-4 py-[14px] flex space-x-3"
          :class="{ 'bg-skin-border/20': notification.unread }"
        >
          <div>
            <AppLink
              :to="{
                name: 'space-overview',
                params: {
                  space: `${notification.proposal.network}:${notification.proposal.space.id}`
                }
              }"
            >
              {{ notification.proposal.space.name }}
            </AppLink>
            proposal has {{ notification.type }}
            {{ _rt(notification.timestamp) }}
            <AppLink
              :to="{
                name: 'space-proposal-overview',
                params: {
                  proposal: notification.proposal.proposal_id,
                  space: `${notification.proposal.network}:${notification.proposal.space.id}`
                }
              }"
            >
              <h3
                class="font-normal text-[21px]"
                v-text="
                  notification.proposal.title ||
                  `#${notification.proposal.proposal_id}`
                "
              />
            </AppLink>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="px-4 py-3 flex items-center space-x-2">
      <IH-exclamation-circle class="inline-block" />
      <span>All caught up, you don't have any notifications</span>
    </div>
  </div>
</template>
