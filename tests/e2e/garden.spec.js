import { test, expect } from './fixtures';
import { AppMenuController } from './controllers/AppMenuController';
import { LocalViewController } from './controllers/LocalViewController';
import { SettingsController } from './controllers/SettingsController';

// The garden is drawn by the app when it starts, and the flowers it has are kept in the session for the actions
// of the settings: nothing here is made by the spec, it waits for what the app made.

test('the flowers of the garden can be imported to the browser', async ({ page }) => {
	// the garden is drawn first, and then its flowers are imported: both take a while
	test.setTimeout(180_000);
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const settings = new SettingsController(page);
	await settings.goto();
	await settings.waitForGarden();

	await settings.importGardenFlowers();
	// leaving the tab of the settings ends the import, and it starts a moment after the click
	await settings.waitForImportToFinish();
	await menu.openTab('Local');

	await expect.poll(() => local.cards().count(), { timeout: 120_000 }).toBeGreaterThan(0);
});

test('the flowers of the garden can be exported', async ({ page }) => {
	test.setTimeout(120_000);
	const settings = new SettingsController(page);
	await settings.goto();
	await settings.waitForGarden();

	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Export garden Flowers' }).click();
	await page.locator('#globalConfirm').getByTestId('confirm-yes').click();
	const download = await downloadPromise;

	expect(download.suggestedFilename()).toBe('gardenFlowers.json');
});
