import { Meta, StoryObj } from '@storybook/vue3-vite';
import ContainerSettings from './ContainerSettings.vue';

const meta = {
  title: 'Ui/ContainerSettings',
  component: ContainerSettings,
  tags: ['autodocs']
} satisfies Meta<typeof ContainerSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'General',
    description: 'Configure your space settings.',
    default: 'Settings content goes here.'
  }
};

export const WithActions: Story = {
  render: args => ({
    components: { ContainerSettings },
    setup: () => ({ args }),
    template: `
      <ContainerSettings title="Members" description="Manage who can access your space.">
        <template #actions>
          <button class="border rounded-full px-3 py-1 text-sm">Add member</button>
        </template>
        <div class="border rounded-md p-4">Members list</div>
      </ContainerSettings>
    `
  })
};

export const TitleOnly: Story = {
  args: {
    title: 'Voting',
    default: 'Voting settings content.'
  }
};
