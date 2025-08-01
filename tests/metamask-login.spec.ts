import { expect, test } from './fixtures/base';

test.setTimeout(60 * 1000);

test('should successfully login with MetaMask', async ({
  page,
  authPage,
  wallet
}) => {
  await wallet.importSeed();

  await page.goto('/');

  await authPage.login();
  await wallet.approveConnection();

  await expect(authPage.profileButton).toBeVisible();

  await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
});

test('should successfully logout after logging in with MetaMask', async ({
  page,
  authPage,
  wallet
}) => {
  await wallet.importSeed();

  await page.goto('/');

  await authPage.login();
  await wallet.approveConnection();

  await expect(authPage.profileButton).toBeVisible();
  await authPage.logout();

  await expect(authPage.loginButton).toBeVisible();

  await expect(page.getByRole('link', { name: 'Home' })).not.toBeVisible();
  await expect(page.getByRole('link', { name: 'Profile' })).not.toBeVisible();
  await expect(page.getByRole('link', { name: 'Settings' })).not.toBeVisible();
});
