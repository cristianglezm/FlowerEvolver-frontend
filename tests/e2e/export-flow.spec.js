import { test, expect } from './fixtures';
import { AppMenuController } from './controllers/AppMenuController';
import { LocalViewController } from './controllers/LocalViewController';
import { SettingsController } from './controllers/SettingsController';

test('exporting local flowers triggers a download of localFlowers.json', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const settings = new SettingsController(page);

	await local.goto();
	await menu.newLocalFlower();
	await local.expectFlowerCount(1);

	await settings.goto();
	const downloadPromise = page.waitForEvent('download');
	await settings.exportLocalFlowers();
	const download = await downloadPromise;

	expect(download.suggestedFilename()).toBe('localFlowers.json');
});

test('exporting with no favourites shows an error instead of downloading', async ({ page }) => {
	const local = new LocalViewController(page);
	const settings = new SettingsController(page);

	// AppActions.vue checks db.favourites.count() before exporting and
	// pushes an ErrorStore message instead of downloading anything when
	// it's zero - no favourites were added in this test.
	await local.goto();
	await settings.goto();

	await settings.exportFavouriteFlowers();
	await expect(page.getByText('You have no favourites to export')).toBeVisible();
});
