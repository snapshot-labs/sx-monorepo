import { expect, test } from './fixtures/metamask';

test.setTimeout(60 * 1000);

test('should successfully login with MetaMask', async ({ page, wallet }) => {
  await wallet.importSeed();

  await page.goto('/');

  await page
    .getByRole('banner')
    .getByRole('button', { name: 'Log in' })
    .click();

  await expect(
    page.getByRole('heading', { name: 'Log in', exact: true })
  ).toBeVisible();

  await page.getByRole('button', { name: /MetaMask/ }).click();

  await wallet.approveConnection();

  await page.bringToFront();

  await expect(
    page.getByRole('banner').getByTestId('profile-button')
  ).toBeVisible();

  await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
});

test('should successfully logout after logging in with MetaMask', async ({
  page,
  wallet
}) => {
  await wallet.importSeed();

  await page.goto('/');

  await page
    .getByRole('banner')
    .getByRole('button', { name: 'Log in' })
    .click();

  await expect(
    page.getByRole('heading', { name: 'Log in', exact: true })
  ).toBeVisible();

  await page.getByRole('button', { name: /MetaMask/ }).click();

  await wallet.approveConnection();

  await page.bringToFront();

  await expect(
    page.getByRole('banner').getByTestId('profile-button')
  ).toBeVisible();

  await page.getByRole('banner').getByTestId('profile-button').click();

  await page.getByRole('button', { name: 'Log out' }).click();

  await expect(
    page.getByRole('banner').getByRole('button', { name: 'Log in' })
  ).toBeVisible();

  await expect(page.getByRole('link', { name: 'Home' })).not.toBeVisible();
  await expect(page.getByRole('link', { name: 'Profile' })).not.toBeVisible();
  await expect(page.getByRole('link', { name: 'Settings' })).not.toBeVisible();
});
