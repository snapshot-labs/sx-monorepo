import type { Meta, StoryObj } from '@storybook/vue3-vite';
import ContainerSettings from './ContainerSettings.vue';

const meta = {
  title: 'Ui/ContainerSettings',
  component: ContainerSettings
} satisfies Meta<typeof ContainerSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { title: 'Voting', description: 'Set how proposals are voted on.' },
  render: args => ({
    components: { ContainerSettings },
    setup: () => ({ args }),
    template:
      '<ContainerSettings v-bind="args"><div class="border p-3">Settings content</div></ContainerSettings>'
  })
};

export const WithActions: Story = {
  args: { title: 'Members' },
  render: args => ({
    components: { ContainerSettings },
    setup: () => ({ args }),
    template: `
      <ContainerSettings v-bind="args">
        <template #actions><button class="border rounded-full px-3">Add</button></template>
        <div class="border p-3">Settings content</div>
      </ContainerSettings>`
  })
};
