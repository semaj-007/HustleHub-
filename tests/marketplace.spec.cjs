const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
async function register(page, role, email, name) {
  await page.goto('/register');
  await page.getByLabel(role === 'freelancer' ? /Offer my skills/ : /Find talent/).check();
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill('StrongPassword123');
  await page.getByRole('button', { name: 'Create my account' }).click();
  await expect(
    page.getByRole('heading', { name: new RegExp('Let’s make things happen') }),
  ).toBeVisible();
}
test('freelancer lists, client books, and the correct freelancer sees simulated income', async ({
  page,
  browser,
}, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const id = randomUUID();
  await register(page, 'freelancer', `maker-${id}@example.com`, 'Ava Studio');
  await page.getByRole('button', { name: 'Create a service', exact: true }).first().click();
  const editor = page.getByRole('dialog');
  await editor.getByLabel('Service title').fill('Thoughtful brand identity for your next chapter');
  await editor
    .getByLabel('Description')
    .fill(
      'A complete brand identity, from a considered logo to a cohesive visual toolkit for your independent business.',
    );
  await editor.getByLabel('Price (ZAR)').fill('2500.50');
  await editor.getByLabel('Delivery (days)').fill('5');
  await editor.getByRole('button', { name: 'Create service', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Thoughtful brand identity for your next chapter' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Explore talent', exact: true }).click();
  await expect(page.getByText('1 service to move you forward')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('marketplace-desktop.png'), fullPage: true });
  await page
    .getByRole('button', { name: 'View Thoughtful brand identity for your next chapter' })
    .click();
  await expect(page.getByText(/Bookings are available to client accounts/)).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();

  const clientContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const client = await clientContext.newPage();
  client.on('pageerror', (error) => errors.push(error.message));
  await register(client, 'client', `client-${id}@example.com`, 'Jamie Client');
  await client
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Explore talent', exact: true })
    .click();
  await client
    .getByRole('button', { name: 'View Thoughtful brand identity for your next chapter' })
    .click();
  await client.getByRole('button', { name: 'Confirm simulated booking' }).click();
  await expect(client.getByRole('heading', { name: 'You’re booked in!' })).toBeVisible();
  await expect(client.getByText(/No money was charged/)).toBeVisible();
  await client.getByRole('link', { name: 'View my bookings' }).click();
  await expect(
    client.getByRole('heading', { name: 'Thoughtful brand identity for your next chapter' }),
  ).toBeVisible();
  await client.getByRole('link', { name: 'Transactions', exact: true }).click();
  await expect(client.getByText('No real payment', { exact: true })).toBeVisible();
  await expect(client.locator('.record-price')).toContainText('2 500,50');

  await page.getByRole('link', { name: 'My workspace' }).click();
  await expect(page.locator('.stat').filter({ hasText: 'Simulated income' })).toContainText(
    '2 500,50',
  );
  await expect(page.locator('.record-main')).toContainText(
    'Thoughtful brand identity for your next chapter',
  );
  await page
    .getByRole('button', { name: 'Edit Thoughtful brand identity for your next chapter' })
    .click();
  await page.getByLabel('Service title').fill('Updated brand identity for growing businesses');
  await page.getByLabel('Price (ZAR)').fill('3000');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByRole('heading', { name: 'Updated brand identity for growing businesses' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Delete Updated brand identity for growing businesses' })
    .click();
  await page.getByRole('button', { name: 'Remove service', exact: true }).click();
  await expect(page.getByText('Make your first introduction')).toBeVisible();
  await expect(page.locator('.stat').filter({ hasText: 'Simulated income' })).toContainText(
    '2 500,50',
  );
  await page.getByRole('link', { name: 'Transactions', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Thoughtful brand identity for your next chapter' }),
  ).toBeVisible();
  await client.getByRole('button', { name: 'Log out' }).click();
  await client.goto('/bookings');
  await expect(client.getByRole('heading', { name: 'Good to see you again.' })).toBeVisible();
  expect(errors).toEqual([]);
  await clientContext.close();
});
test('mobile navigation, empty state and form validation remain usable', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Big ideas/ })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search services' }).fill('no-match-' + randomUUID());
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('No services found')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath('marketplace-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await expect(page.getByRole('link', { name: 'Explore talent', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.getByRole('link', { name: 'Join the hub', exact: true }).click();
  await page.getByRole('button', { name: 'Create my account' }).click();
  expect(
    await page.getByLabel('Full name').evaluate((element) => element.validity.valueMissing),
  ).toBe(true);
  await expect(page.getByRole('heading', { name: 'Make yourself at home.' })).toBeVisible();
});
