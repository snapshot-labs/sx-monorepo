import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const SHARDS = 8;
const THEMES = ['light', 'dark'];
// Narrow screens only change layout and popup placement.
const PHONE_STATES = ['default', 'click'];
const ALLOWED_HOSTS = [
  'localhost',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];
const CLICKABLE =
  'button, [role=button], [role=switch], [role=checkbox], [role=radio], [role=tab], input[type=checkbox]';

// Each state returns false when the story has nothing to interact with.
const STATES: Record<string, (page: Page) => Promise<boolean>> = {
  default: async () => true,
  focus: async page => {
    await page.keyboard.press('Tab');
    return page.evaluate(() => document.activeElement !== document.body);
  },
  hover: async page => {
    const root = page.locator('#storybook-root');
    const labelled = root.locator('[aria-label]');
    const target = (await labelled.count())
      ? labelled.first()
      : root.locator(':scope > *').first();
    await target.hover({ timeout: 2000 });
    return true;
  },
  // Comboboxes open from their input, which the click state doesn't reach
  input: async page => {
    const target = page.locator('#storybook-root input[role=combobox]').first();
    if (!(await target.count())) return false;
    await target.click({ timeout: 2000 });
    return true;
  },
  click: async page => {
    // A disabled control can't be clicked, like Previous at a minimum month
    const enabled = CLICKABLE.split(', ')
      .map(selector => `${selector}:not([disabled], [aria-disabled="true"])`)
      .join(', ');
    const target = page.locator('#storybook-root').locator(enabled).first();
    if (!(await target.count())) return false;
    await target.click({ timeout: 2000 });
    return true;
  }
};

async function loadStory(page: Page, id: string, theme: string) {
  // The mouse stays where the last step left it, which would show tooltips
  await page.mouse.move(0, 0);
  await page.goto(
    `/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`
  );
  // Storybook marks the body once the story rendered, even an empty one
  await page
    .locator('body.sb-show-main, body.sb-show-errordisplay')
    .waitFor({ timeout: 5000 });
  if (await page.locator('body.sb-show-errordisplay').count()) {
    throw new Error(`${id} threw while rendering`);
  }
  // Storybook adds its CSS after the story renders: wait for Tune's font
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(
    () => getComputedStyle(document.body).fontFamily.includes('Calibre'),
    null,
    { timeout: 5000 }
  );
  await page.evaluate(() =>
    Promise.race([
      document.fonts.ready,
      new Promise(resolve => setTimeout(resolve, 3000))
    ])
  );
}

async function openStory(page: Page, id: string, theme: string) {
  try {
    await loadStory(page, id, theme);
  } catch {
    await loadStory(page, id, theme);
  }
}

for (let shard = 0; shard < SHARDS; shard++) {
  test(`stories shard ${shard}`, async ({ page, request }) => {
    await page.clock.setFixedTime(new Date('2026-11-27T12:00:00Z'));
    await page.route(
      url => !ALLOWED_HOSTS.includes(url.hostname),
      route => route.abort()
    );

    const { entries } = (await (await request.get('/index.json')).json()) as {
      entries: Record<string, { id: string; type: string }>;
    };
    const ids = Object.values(entries)
      .filter(entry => entry.type === 'story')
      .map(entry => entry.id)
      // STORIES=ui-button,ui-message limits a run to stories starting with these
      .filter(id =>
        (process.env.STORIES ?? '').split(',').some(p => id.startsWith(p))
      )
      .filter((_, i) => i % SHARDS === shard);

    const states = Object.entries(STATES).filter(
      ([state]) =>
        test.info().project.name !== 'phone' || PHONE_STATES.includes(state)
    );

    for (const id of ids) {
      for (const theme of THEMES) {
        for (const [state, run] of states) {
          await test.step(`${id} ${state} ${theme}`, async () => {
            try {
              await openStory(page, id, theme);
            } catch (err) {
              expect.soft(String(err), `${id} did not render`).toBe('');
              return;
            }
            const name = `${id}--${state}--${theme}.png`;
            if (!(await run(page).catch(() => false))) {
              // A state the baseline reached must still be reachable.
              const isInBaseline = existsSync(test.info().snapshotPath(name));
              expect.soft(isInBaseline, `${name} can't be reached`).toBe(false);
              return;
            }
            await expect.soft(page).toHaveScreenshot(name);
          });
        }
      }
    }
  });
}
