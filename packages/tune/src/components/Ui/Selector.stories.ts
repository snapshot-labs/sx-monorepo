import { Meta, StoryObj } from '@storybook/vue3-vite';
import Selector from './Selector.vue';

const meta = {
  title: 'Ui/Selector',
  component: Selector,
  tags: ['autodocs'],
  argTypes: {
    isActive: { control: 'boolean' }
  }
} satisfies Meta<typeof Selector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Selector },
    setup: () => ({ args }),
    template: `
      <Selector v-bind="args">
        <div>
          <div class="text-skin-link font-semibold">Option label</div>
          <div class="text-sm">Description of this option</div>
        </div>
      </Selector>
    `
  })
};

export const Active: Story = {
  render: args => ({
    components: { Selector },
    setup: () => ({ args }),
    template: `
      <Selector v-bind="args">
        <div>
          <div class="text-skin-link font-semibold">Selected option</div>
          <div class="text-sm">This option is currently active</div>
        </div>
      </Selector>
    `
  }),
  args: {
    isActive: true
  }
};
