import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppLink from './AppLink.vue';

const meta = {
  title: 'AppLink',
  component: AppLink,
  tags: ['autodocs'],
  argTypes: {
    isExternal: {
      control: { type: 'boolean' }
    }
  }
} satisfies Meta<typeof AppLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InternalLink: Story = {
  args: {
    to: { name: 'home' },
    default: 'Internal link'
  }
};

export const ExternalLink: Story = {
  args: {
    to: 'https://snapshot.org',
    default: 'External link'
  }
};

export const ButtonFallback: Story = {
  args: {
    default: 'Button (no to prop)'
  }
};
