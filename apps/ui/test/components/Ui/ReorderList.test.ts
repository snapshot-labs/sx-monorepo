// @vitest-environment happy-dom
import { createAgent } from '@ui-sdk/vue/agent';
import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import { h, nextTick } from 'vue';
import { UiReorderList as ReorderList } from '@snapshot-labs/tune';

type Network = { name: string };

const agent = createAgent();

it('lets an agent move an item by its text', async () => {
  const [ethereum, base, arbitrum] = ['Ethereum', 'Base', 'Arbitrum'].map(
    name => ({ name })
  );
  const wrapper = mount(ReorderList<Network>, {
    attachTo: document.body,
    attrs: { 'aria-label': 'Networks' },
    props: {
      modelValue: [ethereum, base, arbitrum],
      itemKey: (network: Network) => network,
      'onUpdate:modelValue': (value: Network[]) =>
        wrapper.setProps({ modelValue: value })
    },
    slots: {
      item: ({ element }: { element: Network }) => h('div', element.name)
    }
  });
  await nextTick();

  expect(agent.snapshot()).toContainEqual(
    expect.objectContaining({
      component: 'reorder-list',
      label: 'Networks',
      actions: ['move'],
      items: ['Ethereum', 'Base', 'Arbitrum'].map(label =>
        expect.objectContaining({ label })
      )
    })
  );

  const result = await agent.act({
    steps: [{ ref: 'Networks', action: 'move', args: ['Arbitrum', 0] }]
  });
  expect(result.ok, result.error?.message).toBe(true);
  expect(wrapper.props('modelValue')).toEqual([arbitrum, ethereum, base]);

  for (const args of [
    ['Solana', 0],
    ['Base', 3],
    ['Base', -1],
    ['Base', 0.5]
  ]) {
    const refused = await agent.act({
      steps: [{ ref: 'Networks', action: 'move', args }]
    });
    expect(refused.ok).toBe(false);
  }
  expect(wrapper.props('modelValue')).toEqual([arbitrum, ethereum, base]);

  wrapper.unmount();
});
