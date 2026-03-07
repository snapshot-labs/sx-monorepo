import { Meta, StoryObj } from '@storybook/vue3-vite';
import Container from './Container.vue';

const meta = {
  title: 'Ui/Container',
  component: Container,
  tags: ['autodocs'],
  argTypes: {
    slim: { control: 'boolean' }
  }
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Container },
    setup: () => ({ args }),
    template: `
      <Container v-bind="args">
        <div class="border p-4">Container content</div>
      </Container>
    `
  })
};

export const Slim: Story = {
  render: args => ({
    components: { Container },
    setup: () => ({ args }),
    template: `
      <Container v-bind="args">
        <div class="border p-4">Slim container content</div>
      </Container>
    `
  }),
  args: {
    slim: true
  }
};
