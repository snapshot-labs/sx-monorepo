import { expect, test } from '@playwright/test';

for (const [id, role, label] of [
  ['ui-switch--default', 'switch', 'Switch'],
  ['ui-checkbox--default', 'checkbox', 'Checkbox']
] as const) {
  test(`${role} toggles on click, label click and Space`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await page.waitForLoadState('networkidle');
    const control = page.getByRole(role);

    await expect(control).toHaveAttribute('aria-checked', 'false');
    await control.click();
    await expect(control).toHaveAttribute('aria-checked', 'true');
    await page.getByText(label, { exact: true }).click();
    await expect(control).toHaveAttribute('aria-checked', 'false');
    await control.focus();
    await page.keyboard.press('Space');
    await expect(control).toHaveAttribute('aria-checked', 'true');
  });
}
