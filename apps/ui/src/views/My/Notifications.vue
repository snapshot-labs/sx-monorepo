<script setup lang="ts">
const notificationsStore = useNotificationsStore();
const { modalAccountWithoutDismissOpen } = useModal();
const { web3 } = useWeb3();
const { setTitle } = useTitle();

watchEffect(async () => {
  setTitle(
    `Notifications${notificationsStore.unreadNotificationsCount ? ` (${notificationsStore.unreadNotificationsCount} unread)` : ''}`
  );
});

watch(
  [
    () => web3.value.account,
    () => web3.value.authLoading,
    () => notificationsStore.unreadNotificationsCount
  ],
  ([account, authLoading]) => {
    if (!account && !authLoading) {
      modalAccountWithoutDismissOpen.value = true;
    }

    notificationsStore.refreshLastUnreadTs();
  },
  { immediate: true }
);

onUnmounted(() => {
  modalAccountWithoutDismissOpen.value = false;
});

onUnmounted(() => notificationsStore.markAllAsRead());
</script>

<template>
  <div>
    <UiSectionHeader label="Notifications" sticky />
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
            <TimeRelative :time="notification.timestamp" />
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
                class="font-normal text-[21px] [overflow-wrap:anywhere]"
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
