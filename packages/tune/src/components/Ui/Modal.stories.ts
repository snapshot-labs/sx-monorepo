import { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import Modal from './Modal.vue';

const meta: Meta = {
  title: 'Ui/Modal',
  component: Modal,
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { Modal },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div>
        <button class="border px-3 py-2 rounded" @click="open = true">Open Modal</button>
        <Modal :open="open" @close="open = false">
          <template #header>Modal Title</template>
          Modal body content
          <template #footer>
            <button class="border px-3 py-2 rounded" @click="open = false">Close</button>
          </template>
        </Modal>
      </div>
    `
  })
};

export const NotCloseable: Story = {
  render: () => ({
    components: { Modal },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div>
        <button class="border px-3 py-2 rounded" @click="open = true">Open Modal</button>
        <Modal :open="open" :closeable="false" @close="open = false">
          <template #header>Modal Title</template>
          Modal body content
          <template #footer>
            <button class="border px-3 py-2 rounded" @click="open = false">Close</button>
          </template>
        </Modal>
      </div>
    `
  })
};
