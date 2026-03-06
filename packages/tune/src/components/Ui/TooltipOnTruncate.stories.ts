import { Meta, StoryObj } from '@storybook/vue3-vite';
import TooltipOnTruncate from './TooltipOnTruncate.vue';

const meta = {
  title: 'Ui/TooltipOnTruncate',
  component: TooltipOnTruncate,
  tags: ['autodocs']
} satisfies Meta<typeof TooltipOnTruncate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Truncated: Story = {
  render: args => ({
    components: { TooltipOnTruncate },
    setup() {
      return { args };
    },
    template: `
      <div style="width: 120px;">
        <TooltipOnTruncate v-bind="args">
          This is a very long text that will be truncated and show a tooltip on hover
        </TooltipOnTruncate>
      </div>
    `
  })
};

export const NotTruncated: Story = {
  render: args => ({
    components: { TooltipOnTruncate },
    setup() {
      return { args };
    },
    template: `
      <div style="width: 400px;">
        <TooltipOnTruncate v-bind="args">
          Short text
        </TooltipOnTruncate>
      </div>
    `
  })
};

export const WithContentProp: Story = {
  render: args => ({
    components: { TooltipOnTruncate },
    setup() {
      return { args };
    },
    template: `
      <div style="width: 120px;">
        <TooltipOnTruncate v-bind="args" />
      </div>
    `
  }),
  args: {
    content:
      'This is a very long text passed via the content prop that will be truncated'
  }
};
