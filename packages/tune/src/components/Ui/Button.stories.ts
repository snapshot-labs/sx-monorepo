import type { Meta, StoryObj } from '@storybook/vue3-vite';
import Button from './Button.vue';

const meta = {
  title: 'Ui/Button',
  component: Button,
  // The text goes in the slot explicitly: Storybook only maps a `default` arg
  // to the slot when it can read the component source
  render: ({ default: text, ...args }) => ({
    components: { Button },
    setup: () => ({ args, text }),
    template: '<Button v-bind="args">{{ text }}</Button>'
  }),
  tags: ['autodocs'],
  argTypes: {
    type: { control: 'select', options: ['button', 'submit', 'reset'] }
  }
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    primary: false,
    default: 'Button'
  }
};

export const Primary: Story = {
  args: {
    primary: true,
    default: 'Primary button'
  }
};

export const Disabled: Story = {
  args: {
    default: 'Disabled button',
    disabled: true
  }
};

export const Loading: Story = {
  args: {
    default: 'Loading button',
    loading: true
  }
};
