import { Meta, StoryObj } from '@storybook/vue3-vite';
import SelectorNetwork from './SelectorNetwork.vue';

const meta = {
  title: 'Ui/SelectorNetwork',
  component: SelectorNetwork,
  tags: ['autodocs'],
  parameters: {
    docs: {
      story: {
        height: '300px'
      }
    }
  },
  decorators: [
    () => ({
      template: '<div class="s-box"><story /></div>'
    })
  ]
} satisfies Meta<typeof SelectorNetwork>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    modelValue: null,
    definition: {
      type: 'string',
      title: 'Select Network',
      description: 'Choose a network from the available options',
      networkId: 'eth'
    }
  }
};

export const WithFullNetworksList: Story = {
  args: {
    modelValue: null,
    definition: {
      type: 'string',
      title: 'Full Networks List',
      description: 'Display all available networks',
      networkId: 'eth',
      networksListKind: 'full'
    }
  }
};

export const WithBuiltinNetworks: Story = {
  args: {
    modelValue: null,
    definition: {
      type: 'string',
      title: 'Builtin Networks',
      description: 'Display only builtin networks',
      networkId: 'eth',
      networksListKind: 'builtin'
    }
  }
};

export const WithNetworksFilter: Story = {
  args: {
    modelValue: null,
    definition: {
      type: 'string',
      title: 'Filtered Networks',
      description: 'Display filtered network options',
      networkId: 'eth',
      networksFilter: ['eth', 'matic', 'arb1']
    }
  }
};

export const SelectedNetwork: Story = {
  args: {
    modelValue: 'eth',
    definition: {
      type: 'string',
      title: 'Pre-selected Network',
      description: 'Network selector with a pre-selected value',
      networkId: 'eth'
    }
  }
};
