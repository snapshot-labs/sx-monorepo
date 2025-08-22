import { Meta, StoryObj } from '@storybook/vue3-vite';
import Checkbox from './Checkbox.vue';

const meta = {
  title: 'Ui/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  args: {
    modelValue: false
  }
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

const customLabelContent = 'Custom label content with <strong>HTML</strong>';

export const Default: Story = {
  args: {
    title: 'Checkbox'
  }
};

export const WithSlot: Story = {
  parameters: {
    docs: {
      source: {
        code: `<template>
  <Checkbox :modelValue="false">
    ${customLabelContent}
  </Checkbox>
</template>`
      }
    }
  },
  render: args => ({
    components: { Checkbox },
    setup() {
      return { args };
    },
    template: `
      <Checkbox v-bind="args">
        ${customLabelContent}
      </Checkbox>
    `
  })
};
