import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
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

// A slow async handler, like a wallet signature, still runs on every press
export const Interactive: Story = {
  render: () => ({
    components: { Button },
    setup: () => {
      const presses = ref(0);
      const slow = () => {
        presses.value++;
        return new Promise(resolve => setTimeout(resolve, 5000));
      };
      return { presses, slow };
    },
    template: `
      <div class="flex gap-2">
        <Button id="slow" @click="slow">Sign</Button>
        <Button id="off" disabled @click="presses += 100">Disabled</Button>
        <p id="presses">Presses {{ presses }}</p>
      </div>
    `
  })
};
