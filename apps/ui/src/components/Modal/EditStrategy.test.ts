// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { createConstants } from '@/networks/evm/constants';
import EditStrategy from './EditStrategy.vue';
import Form from '../Ui/Form.vue';

describe('edit strategy modal', () => {
  it('preserves nested strategy callbacks even without a parameter generator', async () => {
    const vanilla = createConstants('eth', {
      pin: async () => ({ provider: 'dummy', cid: 'metadata' })
    }).EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES.find(
      strategy => strategy.name === 'Vanilla'
    )!;
    expect(vanilla.generateParams).toBeUndefined();
    expect(vanilla.generateMetadata).toBeTypeOf('function');
    const initialState = {
      threshold: '1',
      cooldown: '604800',
      maxActiveProposals: '5',
      strategies: [{ ...vanilla, params: { symbol: 'VP', decimals: 0 } }]
    };
    const wrapper = shallowMount(EditStrategy, {
      props: {
        open: true,
        networkId: 'eth',
        strategyAddress: vanilla.address,
        initialState,
        definition: { type: 'object' }
      },
      global: { renderStubDefaultSlot: true }
    });
    await flushPromises();
    const cloned = wrapper.findComponent(Form).props('modelValue');
    expect(cloned.strategies[0].generateMetadata).toBe(
      vanilla.generateMetadata
    );
    expect(cloned.strategies[0].parseParams).toBe(vanilla.parseParams);
    cloned.strategies[0].params.symbol = 'NEW';
    expect(initialState.strategies[0].params.symbol).toBe('VP');
  });
});
