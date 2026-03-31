import type { Meta, StoryObj } from '@storybook/vue3-vite';
import Button from './Button.vue';

const meta = {
  title: 'Ui/Button',
  component: Button,
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

/** Renders as a fixed-size round button, useful for icon-only actions. */
export const Uniform: Story = {
  render: args => ({
    components: { Button },
    setup: () => ({ args }),
    template: `
      <Button v-bind="args">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </Button>
    `
  }),
  args: {
    uniform: true
  }
};
