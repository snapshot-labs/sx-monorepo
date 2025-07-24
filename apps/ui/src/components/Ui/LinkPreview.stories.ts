import { Meta, StoryObj } from '@storybook/vue3-vite';
import LinkPreview from './LinkPreview.vue';

const meta = {
  title: 'Ui/LinkPreview',
  component: LinkPreview,
  tags: ['autodocs'],
  argTypes: {
    url: { control: 'text' },
    showDefault: { control: 'boolean' }
  }
} satisfies Meta<typeof LinkPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    url: 'https://github.com/snapshot-labs/sx-monorepo',
    showDefault: false
  }
};

export const WithDefault: Story = {
  args: {
    url: 'not-a-valid-url',
    showDefault: true
  }
};
