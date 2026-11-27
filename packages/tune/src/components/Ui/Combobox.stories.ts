import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { h, ref } from 'vue';
import Combobox from './Combobox.vue';

const meta = { title: 'Ui/Combobox' } satisfies Meta;

export default meta;
type Story = StoryObj;

const definition = {
  type: 'number',
  title: 'Network',
  examples: ['Select a network'],
  enum: [1, 8453, 42161],
  options: [
    { id: 1, name: 'Ethereum' },
    { id: 8453, name: 'Base' },
    { id: 42161, name: 'Arbitrum' }
  ]
};

const render =
  (value: number | null): Story['render'] =>
  args => ({
    components: { Combobox },
    setup: () => ({ args, value: ref(value) }),
    template: '<Combobox v-model="value" v-bind="args" />'
  });

export const Empty: Story = { args: { definition }, render: render(null) };
export const Filled: Story = { args: { definition }, render: render(8453) };
export const WithError: Story = {
  args: { definition, error: 'Pick a network', required: true },
  render: render(null)
};

export const Interactive: Story = {
  args: { definition },
  render: args => ({
    components: { Combobox },
    setup: () => ({ args, value: ref<number | null>(8453) }),
    template: `
      <div>
        <Combobox v-model="value" v-bind="args" />
        <p id="value">Value {{ value === null ? 'null' : value }}</p>
      </div>
    `
  })
};

const dot = (color: string) =>
  h('span', {
    class: 'inline-block rounded-full',
    style: { background: color }
  });

const definitionWithIcons = {
  ...definition,
  options: definition.options.map((option, i) => ({
    ...option,
    icon: dot(['#627eea', '#0052ff', '#28a0f0'][i] ?? '')
  }))
};

export const WithIcons: Story = {
  args: { definition: definitionWithIcons },
  render: render(8453)
};

export const Inline: Story = {
  args: { definition: definitionWithIcons, inline: true, gap: 12 },
  render: render(1)
};
