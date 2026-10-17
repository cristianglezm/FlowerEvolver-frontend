import { test, expect } from '@playwright/test';

test('app loads and redirects to LastAdded', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Flower Evolver');
    await expect(page).toHaveURL(/\/LastAdded$/);
});
