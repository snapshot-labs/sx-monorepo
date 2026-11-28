import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { h, onMounted, ref } from 'vue';
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

// A value set from outside and options that load after the value both show
// the right label
export const ExternalChanges: Story = {
  render: () => ({
    components: { Combobox },
    setup: () => {
      const value = ref<number | null>(8453);
      const late = ref<number | null>(42161);
      const lateDefinition = ref({
        ...definition,
        title: 'Late',
        options: [] as typeof definition.options
      });
      onMounted(() =>
        setTimeout(
          () => (lateDefinition.value = { ...definition, title: 'Late' }),
          300
        )
      );
      return { value, late, lateDefinition, definition };
    },
    template: `
      <div>
        <Combobox v-model="value" :definition="definition" />
        <button id="set-ethereum" @click="value = 1">Set Ethereum</button>
        <button id="set-null" @click="value = null">Set null</button>
        <Combobox v-model="late" :definition="lateDefinition" />
      </div>
    `
  })
};
