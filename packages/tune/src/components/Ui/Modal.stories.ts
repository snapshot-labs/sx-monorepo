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

export const Interactive: Story = {
  args: { open: false },
  render: args => ({
    components: { Modal },
    setup: () => ({ args, isOpen: ref(false), isNestedOpen: ref(false) }),
    template: `
      <div>
        <button id="open" class="border rounded-full px-3" @click="isOpen = true">Open</button>
        <Modal v-bind="args" :open="isOpen" @close="isOpen = false">
          <template #header><h3>Delegate</h3></template>
          <div class="p-4">
            <button id="open-nested" class="border rounded-full px-3" @click="isNestedOpen = true">Open another</button>
          </div>
        </Modal>
        <Modal :open="isNestedOpen" @close="isNestedOpen = false">
          <template #header><h3>Log in</h3></template>
          <div class="p-4">On top</div>
        </Modal>
      </div>`
  })
};
