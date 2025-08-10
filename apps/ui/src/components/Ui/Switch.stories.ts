import { Meta, StoryObj } from '@storybook/vue3-vite';
import Switch from './Switch.vue';

const meta = {
  title: 'Ui/Switch',
  component: Switch,
  tags: ['autodocs']
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    modelValue: false,
    title: 'Switch'
  }
};

export const Enabled: Story = {
  args: {
    modelValue: true,
    title: 'Enabled switch'
  }
};

export const WithTooltip: Story = {
  args: {
    modelValue: false,
    title: 'Switch with tooltip',
    tooltip: 'This is a helpful tooltip explaining what this switch does'
  }
};

export const EnabledWithTooltip: Story = {
  args: {
    modelValue: true,
    title: 'Enabled switch with tooltip',
    tooltip: 'This switch is currently enabled'
  }
};
