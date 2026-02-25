import { expect, test } from './fixtures/base';

test.setTimeout(60 * 1000);

test('should load WalletConnect', async ({ page, authPage }) => {
  await page.goto('/');

  await authPage.login('WalletConnect');

  await expect(
    page.getByText('Scan this QR Code with your phone')
  ).toBeVisible();
});
