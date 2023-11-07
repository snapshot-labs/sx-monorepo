<script setup lang="ts">
import { ProposalState } from '@/types';

const colors: Record<ProposalState, string> = {
  pending: '#7d8590',
  active: '#3fb950',
  passed: '#3fb950',
  rejected: '#f85149',
  executed: '#a371f7'
};

const titles: Record<ProposalState, string> = {
  pending: 'Pending',
  active: 'Active',
  passed: 'Passed',
  rejected: 'Rejected',
  executed: 'Executed'
};

withDefaults(
  defineProps<{
    width?: number | string;
    height?: number | string;
    state: ProposalState;
  }>(),
  {
    width: 24,
    height: 24
  }
);
</script>

<template>
  <UiTooltip :title="titles[state]">
    <svg
      :width="width"
      :height="height"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        v-if="state === 'pending'"
        d="M15 13.0002L16 13.0003L16.0001 11.0003L15.0001 11.0002L15 13.0002ZM9.00004 11L8.00004 11L7.99997 13L8.99997 13L9.00004 11ZM20 4H21V3H20V4ZM20 20V21H21V20H20ZM4 20H3V21H4V20ZM4 4V3H3V4H4ZM15.0001 11.0002L9.00004 11L8.99997 13L15 13.0002L15.0001 11.0002ZM19 4V20H21V4H19ZM20 19H4V21H20V19ZM5 20V4H3V20H5ZM4 5H20V3H4V5Z"
        :fill="colors[state]"
      />
      <path
        v-else-if="state === 'active'"
        d="M20 20V4H4V20H20Z"
        :stroke="colors[state]"
        stroke-width="2"
        stroke-linecap="round"
      />
      <path
        v-else-if="state === 'passed' || state === 'executed'"
        d="M13 9.00023L13 8.00023L11 8.00022L11 9.00022L13 9.00023ZM11 15L11 16L13 16L13 15L11 15ZM15 13.0002L16 13.0003L16.0001 11.0003L15.0001 11.0002L15 13.0002ZM9.00004 11L8.00004 11L7.99997 13L8.99997 13L9.00004 11ZM20 4H21V3H20V4ZM20 20V21H21V20H20ZM4 20H3V21H4V20ZM4 4V3H3V4H4ZM11 9.00022L11 15L13 15L13 9.00023L11 9.00022ZM15.0001 11.0002L9.00004 11L8.99997 13L15 13.0002L15.0001 11.0002ZM19 4V20H21V4H19ZM20 19H4V21H20V19ZM5 20V4H3V20H5ZM4 5H20V3H4V5Z"
        :fill="colors[state]"
      />
      <path
        v-else-if="state === 'rejected'"
        d="M15.7071 9.70723L16.4142 9.00012L15 7.58591L14.2929 8.29302L15.7071 9.70723ZM8.29291 14.293L7.5858 15.0001L9.00002 16.4143L9.70712 15.7072L8.29291 14.293ZM14.2929 15.7072L15 16.4143L16.4142 15.0001L15.7071 14.293L14.2929 15.7072ZM9.70712 8.29302L9.00002 7.58591L7.5858 9.00012L8.29291 9.70723L9.70712 8.29302ZM20 4H21V3H20V4ZM20 20V21H21V20H20ZM4 20H3V21H4V20ZM4 4V3H3V4H4ZM14.2929 8.29302L8.29291 14.293L9.70712 15.7072L15.7071 9.70723L14.2929 8.29302ZM15.7071 14.293L9.70712 8.29302L8.29291 9.70723L14.2929 15.7072L15.7071 14.293ZM19 4V20H21V4H19ZM20 19H4V21H20V19ZM5 20V4H3V20H5ZM4 5H20V3H4V5Z"
        :fill="colors[state]"
      />
    </svg>
  </UiTooltip>
</template>
