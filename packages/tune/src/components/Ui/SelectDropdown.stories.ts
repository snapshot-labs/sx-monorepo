import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import SelectDropdown from './SelectDropdown.vue';

const meta = {
  title: 'Ui/SelectDropdown'
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    title: 'Sort',
    items: [
      { key: 'newest', label: 'Newest' },
      { key: 'oldest', label: 'Oldest' },
      { key: 'votes', label: 'Most votes' }
    ]
  },
  render: args => ({
    components: { SelectDropdown },
    setup: () => ({ args, value: ref('newest') }),
    template: '<SelectDropdown v-model="value" v-bind="args" />'
  })
};
