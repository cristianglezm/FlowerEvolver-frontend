import { test, expect } from './fixtures';
import { AppMenuController } from './controllers/AppMenuController';
import { LocalViewController } from './controllers/LocalViewController';
import { ListViewController } from './controllers/ListViewController';
import { FlowerCardController } from './controllers/FlowerCardController';

test('a favourite flower is in the Favourites tab, and leaves it when it is not a favourite any more', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const favourites = new ListViewController(page);
	await local.goto();
	await menu.newLocalFlower();
	await menu.newLocalFlower();
	await local.expectFlowerCount(2);

	// the newest is the first card
	const card = await local.firstCard();
	const id = await card.id();
	await card.favourite();

	await menu.openTab('Favourites');
	await favourites.expectIds([id]);

	await favourites.card(0).favourite();
	await favourites.expectFlowerCount(0);
	await expect(page.getByText("You don't have favourites.")).toBeVisible();
});

test('only the favourites are in the Favourites tab, the newest first', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const favourites = new ListViewController(page);
	await local.goto();
	for(let i = 0; i < 3; ++i){
		await menu.newLocalFlower();
	}
	await local.expectFlowerCount(3);

	// the cards are 3, 2, 1: the oldest and the newest are the favourites
	await new FlowerCardController(page, local.cards().nth(0)).favourite();
	await new FlowerCardController(page, local.cards().nth(2)).favourite();

	await menu.openTab('Favourites');
	await favourites.expectIds([3, 1]);
});

test('the favourites are still there after the app is loaded again', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const favourites = new ListViewController(page);
	await local.goto();
	await menu.newLocalFlower();
	await local.expectFlowerCount(1);
	await (await local.firstCard()).favourite();
	// it is saved when it is in the tab, which is after the click
	await menu.openTab('Favourites');
	await favourites.expectIds([1]);

	await page.reload();

	await favourites.expectIds([1]);
});

test('the image of a flower of the browser has a text that says which flower it is', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	await local.goto();
	await menu.newLocalFlower();
	await local.expectFlowerCount(1);

	const id = await (await local.firstCard()).id();

	await expect(page.locator('img.FlowerImage').first()).toHaveAttribute('alt', new RegExp(`^Flower ${id} - `));
});
