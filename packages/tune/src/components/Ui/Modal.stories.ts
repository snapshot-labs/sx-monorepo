import { Meta, StoryObj } from '@storybook/vue3-vite';
import { fn } from 'storybook/test';
import Modal from './Modal.vue';

const meta = {
  title: 'Ui/Modal',
  component: Modal,
  tags: ['autodocs'],
  args: {
    open: true,
    onClose: fn()
  }
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Modal },
    setup: () => ({ args }),
    template: `
      <Modal v-bind="args">
        <template #header>
          <h3 class="text-lg">Modal title</h3>
        </template>
        <div class="p-4">Modal body content goes here.</div>
        <template #footer>
          <button class="border rounded-full px-4 py-2">Confirm</button>
        </template>
      </Modal>
    `
  })
};

export const BodyOnly: Story = {
  render: args => ({
    components: { Modal },
    setup: () => ({ args }),
    template: `
      <Modal v-bind="args">
        <div class="p-4">Simple modal with body content only.</div>
      </Modal>
    `
  })
};

export const NotCloseable: Story = {
  render: args => ({
    components: { Modal },
    setup: () => ({ args }),
    template: `
      <Modal v-bind="args" :closeable="false">
        <template #header>
          <h3 class="text-lg">Required action</h3>
        </template>
        <div class="p-4">You must complete this action before continuing.</div>
      </Modal>
    `
  })
};
