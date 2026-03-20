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
  args: {
    title: 'Settings section',
    description: 'A description for this section'
  },
  render: args => ({
    components: { ContainerSettings },
    setup() {
      return { args };
    },
    template:
      '<ContainerSettings v-bind="args">Settings content goes here</ContainerSettings>'
  })
};

export const WithoutDescription: Story = {
  args: {
    title: 'Settings section'
  },
  render: args => ({
    components: { ContainerSettings },
    setup() {
      return { args };
    },
    template:
      '<ContainerSettings v-bind="args">Settings content goes here</ContainerSettings>'
  })
};
