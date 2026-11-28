// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { h, nextTick } from 'vue';
import { UiButton } from '@snapshot-labs/tune';
import { registerAgentTools } from '@/helpers/agent';

type Tool = {
  name: string;
  execute: (input: object) => Promise<{ ok: boolean; error?: object }>;
};

const { createAgent } = vi.hoisted(() => ({ createAgent: vi.fn() }));
vi.mock('@ui-sdk/vue/agent', async importOriginal => {
  const actual = await importOriginal<{ createAgent: () => unknown }>();
  createAgent.mockImplementation(actual.createAgent);
  return { ...actual, createAgent };
});

describe('registerAgentTools', () => {
  afterEach(() => {
    Reflect.deleteProperty(document, 'modelContext');
  });

  it('does nothing in a browser without WebMCP', () => {
    registerAgentTools();

    expect(createAgent).not.toHaveBeenCalled();
  });

  it('lets an agent press buttons, except the ones left to the person', async () => {
    const tools: Record<string, Tool> = {};
    Object.assign(document, {
      modelContext: {
        registerTool: async (tool: Tool) => {
          tools[tool.name] = tool;
        }
      }
    });
    registerAgentTools();
    await nextTick();
    expect(Object.keys(tools).sort()).toEqual(['act', 'query', 'snapshot']);

    const onSave = vi.fn();
    const onDelete = vi.fn();
    const wrapper = mount(
      {
        render: () => [
          h(UiButton, { onClick: onSave }, () => 'Save'),
          h(
            UiButton,
            { 'data-agent-confirm': 'Deletes it for good', onClick: onDelete },
            () => 'Delete'
          )
        ]
      },
      { attachTo: document.body }
    );
    await nextTick();

    const press = (ref: string) =>
      tools.act.execute({ steps: [{ ref, action: 'press' }] });

    expect(await press('Save')).toMatchObject({ ok: true });
    expect(onSave).toHaveBeenCalledOnce();
    expect(await press('Delete')).toMatchObject({ ok: false });
    expect(onDelete).not.toHaveBeenCalled();

    wrapper.unmount();
  });
});
