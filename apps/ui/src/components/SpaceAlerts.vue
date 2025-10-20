<script setup lang="ts">
import { Space, Task } from '@/types';

const props = defineProps<{ space: Space }>();

const { isController, isAdmin } = useSpaceSettings(toRef(props, 'space'));
const { alerts } = useSpaceAlerts(toRef(props, 'space'));

const pendingTasks = computed(() => {
  const _alerts: Task[] = [];

  console.log('[SpaceAlerts] Computing pending tasks, alerts:', {
    alertsMap: Array.from(alerts.value.entries()),
    hasProExpiring: alerts.value.has('PRO_EXPIRING_SOON'),
    isController: isController.value,
    isAdmin: isAdmin.value
  });

  if (alerts.value.has('PRO_EXPIRING_SOON')) {
    const data = alerts.value.get('PRO_EXPIRING_SOON');
    const days = data?.daysUntilExpiration || 0;
    const daysText = days === 1 ? '1 day' : `${days} days`;
    console.log('[SpaceAlerts] Adding PRO_EXPIRING_SOON alert:', { data, days, daysText });
    _alerts.push({
      description: `Your Pro plan expires in ${daysText}, renew now`,
      link: { name: 'space-pro' },
      type: 'warning'
    });
  }

  if (
    alerts.value.has('HAS_DEPRECATED_STRATEGIES') ||
    alerts.value.has('HAS_DISABLED_STRATEGIES') ||
    alerts.value.has('HAS_PRO_ONLY_STRATEGIES') ||
    alerts.value.has('HAS_PRO_ONLY_NETWORKS')
  ) {
    _alerts.push({
      description: 'Voting strategies need to be updated',
      link: { name: 'space-settings', params: { tab: 'voting-strategies' } },
      type: 'error'
    });
  }

  if (alerts.value.has('HAS_PRO_ONLY_WHITELABEL')) {
    _alerts.push({
      description: 'Custom domain settings need to be updated',
      link: { name: 'space-settings', params: { tab: 'whitelabel' } },
      type: 'error'
    });
  }

  return _alerts;
});

const isVisible = computed(() => {
  return (isController.value || isAdmin.value) && pendingTasks.value.length > 0;
});
</script>

<template>
  <div v-if="isVisible">
    <UiSectionHeader label="Important" sticky />
    <OnboardingTask v-for="(alert, i) in pendingTasks" :key="i" :task="alert" />
    <div class="mx-4 py-[10px] mb-4 flex gap-x-1.5 text-sm">
      <IH-eye class="mt-[3px]" /> Only admins can see this
    </div>
  </div>
</template>
