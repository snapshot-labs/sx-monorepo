import { expect, test } from './fixtures/base';
import type { Page } from '@playwright/test';

type Tool = { name: string; execute: (input: object) => Promise<unknown> };

// A browser with WebMCP: the page registers its tools on document.modelContext
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const tools: Record<string, Tool> = {};
    Object.assign(window, { tools });
    Object.assign(document, {
      modelContext: {
        registerTool: async (tool: Tool) => {
          tools[tool.name] = tool;
        }
      }
    });
  });
});

function callTool(page: Page, name: string, input: object) {
  return page.evaluate(
    async ([name, input]) => {
      const { tools } = window as unknown as { tools: Record<string, Tool> };
      return JSON.parse(JSON.stringify(await tools[name]!.execute(input)));
    },
    [name, input] as const
  );
}

test('a browser agent reads and uses the page', async ({
  page,
  explorePage
}) => {
  await explorePage.goto();
  await expect(page.getByRole('combobox', { name: 'Network' })).toBeVisible();

  const components = await callTool(page, 'snapshot', {});
  expect(components).toContainEqual(
    expect.objectContaining({ component: 'combobox', label: 'Network' })
  );

  // The networks load after the page: a step that finds no Base changes
  // nothing, so the agent can try again
  await expect
    .poll(() =>
      callTool(page, 'act', {
        steps: [{ ref: 'Network', action: 'setValue', args: ['Base'] }]
      })
    )
    .toMatchObject({ ok: true });
  await expect(page).toHaveURL(/n=8453/);
});

test('every component an agent sees has a name', async ({
  page,
  spacePage
}) => {
  await spacePage.goto('s:arbitrumfoundation.eth');
  await expect(spacePage.spaceName).toBeVisible();
  await expect(spacePage.summaryProposalsList).toBeVisible();

  const components: {
    ref: string;
    component: string;
    label?: string;
    offPage?: boolean;
  }[] = await callTool(page, 'snapshot', {});
  expect(components.length).toBeGreaterThan(5);
  // Past 100 entries the last one is "more", which has no label
  const shown = components.filter(
    entry => !entry.offPage && entry.component !== 'more'
  );
  for (const { ref, component, label } of shown) {
    expect(label, `${component} ${ref} has no name`).toBeTruthy();
  }
});
