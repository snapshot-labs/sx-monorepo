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
    setup() {
      return { args };
    },
    template:
      '<Container v-bind="args" style="border: 1px solid #e5e7eb;">Container content</Container>'
  })
};

export const Slim: Story = {
  args: {
    slim: true
  },
  parameters: {
    docs: {
      description: {
        story:
          'Removes horizontal padding on small screens, adds it back from the `sm` breakpoint up.'
      }
    }
  },
  render: args => ({
    components: { Container },
    setup() {
      return { args };
    },
    template:
      '<Container v-bind="args" style="border: 1px solid #e5e7eb;">Slim container content</Container>'
  })
};
