import { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import Selector from './Selector.vue';

const meta = {
  title: 'Ui/Selector',
  component: Selector,
  tags: ['autodocs']
} satisfies Meta<typeof Selector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isActive: false,
    default: 'Option label'
  }
};

export const Active: Story = {
  args: {
    isActive: true,
    default: 'Active option'
  }
};

export const Interactive: Story = {
  render: () => ({
    components: { Selector },
    setup() {
      const selected = ref(0);
      return { selected };
    },
    template: `
      <div class="flex flex-col gap-2">
        <Selector :isActive="selected === 0" @click="selected = 0">Option A</Selector>
        <Selector :isActive="selected === 1" @click="selected = 1">Option B</Selector>
        <Selector :isActive="selected === 2" @click="selected = 2">Option C</Selector>
      </div>
    `
  })
};
