import { Meta, StoryObj } from '@storybook/vue3-vite';
import Selector from './Selector.vue';

const meta = {
  title: 'Ui/Selector',
  component: Selector,
  tags: ['autodocs'],
  argTypes: {
    isActive: { control: 'boolean' }
  }
} satisfies Meta<typeof Selector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isActive: false
  },
  render: args => ({
    components: { Selector },
    setup() {
      return { args };
    },
    template:
      '<Selector v-bind="args"><span style="padding-right: 24px;">Selector option</span></Selector>'
  })
};

export const Active: Story = {
  args: {
    isActive: true
  },
  render: args => ({
    components: { Selector },
    setup() {
      return { args };
    },
    template:
      '<Selector v-bind="args"><span style="padding-right: 24px;">Active selector option</span></Selector>'
  })
};
