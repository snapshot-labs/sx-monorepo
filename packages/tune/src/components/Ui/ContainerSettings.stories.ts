import { Meta, StoryObj } from '@storybook/vue3-vite';
import ContainerSettings from './ContainerSettings.vue';

const meta = {
  title: 'Ui/ContainerSettings',
  component: ContainerSettings,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' }
  }
} satisfies Meta<typeof ContainerSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { ContainerSettings },
    setup: () => ({ args }),
    template: `
      <ContainerSettings v-bind="args">
        <div class="border p-4">Settings content goes here</div>
      </ContainerSettings>
    `
  }),
  args: {
    title: 'General settings',
    description: 'Configure your space settings below.'
  }
};

export const TitleOnly: Story = {
  render: args => ({
    components: { ContainerSettings },
    setup: () => ({ args }),
    template: `
      <ContainerSettings v-bind="args">
        <div class="border p-4">Content</div>
      </ContainerSettings>
    `
  }),
  args: {
    title: 'Profile'
  }
};
