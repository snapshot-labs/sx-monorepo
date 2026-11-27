// @vitest-environment happy-dom
import { createAgent } from '@ui-sdk/vue/agent';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import {
  UiInputNumber as InputNumber,
  UiInputString as InputString,
  UiTextarea as Textarea
} from '@snapshot-labs/tune';

const agent = createAgent();

function field(
  component: typeof InputString | typeof Textarea | typeof InputNumber,
  title: string,
  modelValue?: unknown
) {
  const wrapper = mount(component as any, {
    attachTo: document.body,
    props: {
      definition: { type: 'string', title },
      modelValue,
      'onUpdate:modelValue': (value: unknown) =>
        wrapper.setProps({ modelValue: value })
    }
  });
  const el = wrapper.find('input, textarea');
  return {
    wrapper,
    model: () => (wrapper.props() as { modelValue?: unknown }).modelValue,
    dom: () => (el.element as HTMLInputElement).value,
    // Typing happens in a focused field, and only fires input (setValue
    // fires change too, like a blur)
    type: async (text: string) => {
      const input = el.element as HTMLInputElement;
      input.focus();
      input.value = text;
      await el.trigger('input');
    },
    blur: async () => {
      await el.trigger('change');
      (el.element as HTMLElement).blur();
    },
    set: async (value: unknown) => {
      await wrapper.setProps({ modelValue: value });
      await nextTick();
    }
  };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('InputString', () => {
  it('trims the model while typing, and the text on blur', async () => {
    const input = field(InputString, 'Name');
    await input.type('hello world ');
    expect(input.model()).toBe('hello world');
    expect(input.dom()).toBe('hello world ');
    await input.type('hello world a');
    expect(input.model()).toBe('hello world a');
    await input.type('  ');
    expect(input.model()).toBe('');
    expect(input.dom()).toBe('  ');
    await input.type(' hi ');
    await input.blur();
    expect(input.dom()).toBe('hi');
    expect(input.model()).toBe('hi');
  });

  it('shows a value set from outside as is', async () => {
    const input = field(InputString, 'Name', ' Foo ');
    expect(input.dom()).toBe(' Foo ');
    await input.set('Bar');
    expect(input.dom()).toBe('Bar');
    await input.set(undefined);
    expect(input.dom()).toBe('');
    expect(input.wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('lets an agent fill it', async () => {
    const input = field(InputString, 'Project name');
    const result = await agent.act({
      steps: [{ ref: 'Project name', action: 'setValue', args: [' Atlas '] }]
    });
    expect(result.ok, result.error?.message).toBe(true);
    expect(input.model()).toBe('Atlas');
  });
});

describe('InputNumber', () => {
  it('turns what is typed into a number', async () => {
    const input = field(InputNumber, 'Quorum');
    await input.type('12');
    expect(input.model()).toBe(12);
    await input.type('1.5');
    expect(input.model()).toBe(1.5);
    await input.type('');
    expect(input.model()).toBe('');
  });

  it('shows a value set from outside', async () => {
    const input = field(InputNumber, 'Quorum', 7);
    expect(input.dom()).toBe('7');
    await input.set(42);
    expect(input.dom()).toBe('42');
  });

  it('lets an agent fill it', async () => {
    const input = field(InputNumber, 'Voting delay');
    const result = await agent.act({
      steps: [{ ref: 'Voting delay', action: 'setValue', args: ['3'] }]
    });
    expect(result.ok, result.error?.message).toBe(true);
    expect(input.model()).toBe(3);
  });
});

describe('Textarea', () => {
  it('keeps the model in sync both ways', async () => {
    const input = field(Textarea, 'About');
    await input.type('line 1\nline 2 ');
    expect(input.model()).toBe('line 1\nline 2 ');
    await input.set('from outside');
    expect(input.dom()).toBe('from outside');
  });

  it('waits before syncing a large value', async () => {
    vi.useFakeTimers();
    const input = field(Textarea, 'Whitelist');
    const large = 'a'.repeat(100_001);
    await input.type(large);
    expect(input.model()).toBeUndefined();
    expect(input.dom()).toBe(large);
    await vi.advanceTimersByTimeAsync(500);
    expect(input.model()).toBe(large);
    expect(input.dom()).toBe(large);
  });

  it('lets an agent fill it', async () => {
    const input = field(Textarea, 'Description');
    const result = await agent.act({
      steps: [{ ref: 'Description', action: 'setValue', args: ['Hello'] }]
    });
    expect(result.ok, result.error?.message).toBe(true);
    expect(input.model()).toBe('Hello');
  });
});
