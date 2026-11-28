import type { Meta, StoryObj } from '@storybook/vue3-vite';
import Container from './Container.vue';

const meta = { title: 'Ui/Container', component: Container } satisfies Meta<
  typeof Container
>;

export default meta;
type Story = StoryObj<typeof meta>;

const render: Story['render'] = args => ({
  components: { Container },
  setup: () => ({ args }),
  template:
    '<Container v-bind="args"><div class="border p-3">Content inside a container</div></Container>'
});

export const Default: Story = { render };
export const Slim: Story = { args: { slim: true }, render };
