<script setup lang="ts">
import { SPACE_ALERTS } from '@/helpers/constants';
import { Space, Task } from '@/types';

const props = defineProps<{ space: Space }>();

const { isController, isAdmin } = useSpaceSettings(toRef(props, 'space'));
const { alerts } = useSpaceAlerts(toRef(props, 'space'));

const isVisible = computed(() => {
  return (isController.value || isAdmin.value) && pendingTasks.value.length > 0;
});

const pendingTasks = computed(() => {
  const _alerts: Task[] = [];

  if (
    alerts.value.has(SPACE_ALERTS.STRATEGIES_DEPRECATED) ||
    alerts.value.has(SPACE_ALERTS.STRATEGIES_PRO_ONLY)
  ) {
    _alerts.push({
      description: 'Voting strategies needs to be updated',
      link: { name: 'space-settings', params: { tab: 'voting-strategies' } },
      type: 'error'
    });
  }

  return _alerts;
});
</script>

<template>
  <div v-if="isVisible">
    <UiLabel label="important" sticky />
    <OnboardingTask v-for="(alert, i) in pendingTasks" :key="i" :task="alert" />
    <div class="mx-4 py-[10px] mb-4 flex gap-x-1.5 text-sm">
      <IH-eye class="mt-[3px]" /> Only admins can see this
    </div>
  </div>
</template>
