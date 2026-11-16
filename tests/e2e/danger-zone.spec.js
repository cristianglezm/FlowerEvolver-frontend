import { test } from './fixtures';
import { AppMenuController } from './controllers/AppMenuController';
import { LocalViewController } from './controllers/LocalViewController';
import { ListViewController } from './controllers/ListViewController';
import { SettingsController } from './controllers/SettingsController';

test('Delete non Favourites keeps the favourites, and Delete All Flowers leaves nothing', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const favourites = new ListViewController(page);
	const settings = new SettingsController(page);
	await local.goto();
	for(let i = 0; i < 3; ++i){
		await menu.newLocalFlower();
	}
	await local.expectFlowerCount(3);
	// the middle one is the favourite
	await local.card(1).favourite();
	await menu.openTab('Favourites');
	await favourites.expectIds([2]);

	await settings.goto();
	await settings.deleteNonFavourites();

	await menu.openTab('Local');
	await local.expectFlowerCount(1);
	await local.card(0).expectImageLoaded();
	await menu.openTab('Favourites');
	await favourites.expectIds([2]);

	await settings.goto();
	await settings.deleteAllFlowers();

	await menu.openTab('Local');
	await local.expectFlowerCount(0);
	await menu.openTab('Favourites');
	await favourites.expectFlowerCount(0);
});

test('the flowers that are made after everything was deleted start from the beginning', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const settings = new SettingsController(page);
	await local.goto();
	await menu.newLocalFlower();
	await menu.newLocalFlower();
	await local.expectFlowerCount(2);
	await settings.goto();
	await settings.deleteAllFlowers();
	await menu.openTab('Local');
	await local.expectFlowerCount(0);

	await menu.newLocalFlower();

	await local.expectFlowerCount(1);
	await local.card(0).expectImageLoaded();
});
