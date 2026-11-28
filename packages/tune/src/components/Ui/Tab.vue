<script setup lang="ts">
import { TabsTab } from '@ui-sdk/vue/tabs';
import { omit } from '../../helpers/utils';
import { TUNE_OPTIONS_KEY } from '../../plugin';

defineProps<{
  value: string | number;
  /** A route to open, else the tab is a button */
  to?: unknown;
}>();

defineSlots<{ default(props: { selected: boolean }): any }>();

const { linkComponent = 'a' } = inject(TUNE_OPTIONS_KEY, {});
</script>

<template>
  <TabsTab :value="String(value)">
    <template #render="{ props, state }">
      <!-- The press handler goes on as a native listener, see DropdownItem -->
      <component
        :is="to ? linkComponent : 'button'"
        v-bind="omit(props, ['onClick'])"
        :type="to ? undefined : 'button'"
        :to="to"
        @click.capture="props.onClick"
      >
        <slot :selected="state.selected" />
      </component>
    </template>
  </TabsTab>
</template>
