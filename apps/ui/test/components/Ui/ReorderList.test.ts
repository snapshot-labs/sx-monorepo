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

it('keeps a list that people cannot reorder out of reach', async () => {
  const wrapper = mount(ReorderList<string>, {
    attachTo: document.body,
    attrs: { 'aria-label': 'Fixed choices' },
    props: {
      modelValue: ['For', 'Against'],
      itemKey: (choice: string) => choice,
      disabled: true
    },
    slots: { item: ({ element }: { element: string }) => h('div', element) }
  });
  await nextTick();

  expect(
    agent.snapshot().filter(entry => entry.label === 'Fixed choices')
  ).toEqual([]);
  const result = await agent.act({
    steps: [{ ref: 'Fixed choices', action: 'move', args: ['Against', 0] }]
  });
  expect(result.ok).toBe(false);
  expect(wrapper.props('modelValue')).toEqual(['For', 'Against']);

  wrapper.unmount();
});
