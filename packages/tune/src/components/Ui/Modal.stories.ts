import type { Meta, StoryObj } from '@storybook/vue3-vite';
import Modal from './Modal.vue';

const meta = { title: 'Ui/Modal', component: Modal } satisfies Meta<
  typeof Modal
>;

export default meta;
type Story = StoryObj<typeof meta>;

const render: Story['render'] = args => ({
  components: { Modal },
  setup: () => ({ args }),
  template: `
    <Modal v-bind="args">
      <template #header><h3>Delegate</h3></template>
      <div class="p-4">Choose who votes on your behalf.</div>
      <template #footer><button class="border rounded-full px-3 w-full">Confirm</button></template>
    </Modal>`
});

export const Open: Story = { args: { open: true }, render };
export const NotCloseable: Story = {
  args: { open: true, closeable: false },
  render
};
