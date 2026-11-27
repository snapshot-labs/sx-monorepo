import { expect, test } from '@playwright/test';

for (const [id, role, name] of [
  ['ui-inputstring--with-error', 'textbox', 'Name'],
  ['ui-textarea--with-error', 'textbox', 'About'],
  ['ui-select--with-error', 'combobox', 'Voting type'],
  ['ui-inputnumber--with-error', 'spinbutton', 'Quorum']
] as const) {
  test(`${id}: the label names the control, the error describes it`, async ({
    page
  }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await page.waitForLoadState('networkidle');
    const control = page.getByRole(role, { name });
    await expect(control).toHaveAttribute('aria-invalid', 'true');
    const error = await page.locator('.s-input-error-message').innerText();
    await expect(control).toHaveAccessibleDescription(error);

    await page.locator('label').first().click();
    await expect(control).toBeFocused();
  });
}
