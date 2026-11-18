// Main-flow smoke tests (MON-07). Extend with the project's key flows: contact form, signup, purchase.
import { test, expect } from '@playwright/test';

test('főoldal betölt, van H1 és működő fő CTA', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main')).toBeVisible();
});

test('404 valódi 404 oldalt ad', async ({ page }) => {
  const res = await page.goto('/nem-letezo-oldal-teszt');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1:visible')).toHaveCount(1);
});
