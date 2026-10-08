// @vitest-environment happy-dom
import { shallowMount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { StrategyConfig } from '@/networks/types';
import ActiveStrategy from './FormStrategiesStrategyActive.vue';
import FormValidation from './FormValidation.vue';
import EditStrategy from './Modal/EditStrategy.vue';
import StrategiesConfigurator from './StrategiesConfigurator.vue';

const strategy: StrategyConfig = {
  id: 'validator',
  address: '0x0000000000000000000000000000000000000001',
  type: 'VotingPowerWithCooldown',
  name: 'Voting power with cooldown',
  params: {
    threshold: '1',
    cooldown: '604800',
    maxActiveProposals: '5',
    strategies: []
  },
  paramsDefinition: { type: 'object' }
};

function mount(modelValue: StrategyConfig | null) {
  return shallowMount(FormValidation, {
    props: {
      modelValue,
      networkId: 'eth',
      title: 'Proposal validation',
      description: '',
      spaceId: '',
      votingPowerSymbol: 'VP',
      availableStrategies: [strategy],
      availableVotingStrategies: []
    },
    global: { renderStubDefaultSlot: true, stubs: { teleport: true } }
  });
}

describe('proposal validation form', () => {
  it('uses the same nested strategy configurator and explains the actual cooldown semantics', async () => {
    const wrapper = mount(strategy);
    expect(wrapper.text()).toContain(
      'Each successful proposal restarts the cooldown'
    );
    expect(wrapper.text()).toContain('zero cooldown disables the limit');
    const configurator = wrapper.findComponent(StrategiesConfigurator);
    expect(configurator.exists()).toBe(true);
    expect(configurator.props('limit')).toBe(128);
    configurator.vm.$emit('update:modelValue', [strategy]);
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual({
      ...strategy,
      params: { ...strategy.params, strategies: [strategy] }
    });
  });

  it('reopens numeric settings without losing the included strategies', async () => {
    const wrapper = mount(strategy);
    wrapper.findComponent(ActiveStrategy).vm.$emit('edit-strategy', strategy);
    await wrapper.vm.$nextTick();
    const modal = wrapper.findComponent(EditStrategy);
    expect(modal.props('initialState')).toEqual(strategy.params);
    modal.vm.$emit('save', { ...strategy.params, maxActiveProposals: '3' });
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual({
      ...strategy,
      params: { ...strategy.params, maxActiveProposals: '3' }
    });
  });

  it('keeps plain voting power editable without a cooldown warning', () => {
    const wrapper = mount({ ...strategy, type: 'VotingPower' });
    expect(wrapper.findComponent(StrategiesConfigurator).exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Each successful proposal');
  });
});
