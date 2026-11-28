import { expect, test } from '@playwright/test';

test('arrows show by the scroll edges and scroll the list', async ({
  page
}) => {
  await page.goto(
    '/iframe.html?id=ui-scrollerhorizontal--with-buttons&viewMode=story'
  );
  await page.waitForLoadState('networkidle');
  const viewport = page.locator('.no-scrollbar');
  const arrows = page.locator('#storybook-root button:has(svg)');
  const scrollLeft = () => viewport.evaluate(el => el.scrollLeft);

  // At the start only the right arrow shows
  await expect(arrows).toHaveCount(1);
  await arrows.click();
  await expect.poll(scrollLeft).toBeGreaterThan(0);
  await expect(arrows).toHaveCount(2);

  // At the end only the left one
  await viewport.evaluate(el => (el.scrollLeft = el.scrollWidth));
  await expect(arrows).toHaveCount(1);
  await arrows.click();
  await expect
    .poll(() =>
      viewport.evaluate(el => el.scrollWidth - el.clientWidth - el.scrollLeft)
    )
    .toBeGreaterThan(0);
});

test('a sticky class from the caller keeps the bar sticky', async ({
  page
}) => {
  await page.goto(
    '/iframe.html?id=ui-scrollerhorizontal--sticky&viewMode=story'
  );
  await page.waitForLoadState('networkidle');
  // UI SDK sets its own root's position: ours must keep the caller's
  const bar = page.locator('#sticky');
  await expect(bar).toHaveCSS('position', 'sticky');
  await expect(bar).toHaveCSS('top', '20px');
});
