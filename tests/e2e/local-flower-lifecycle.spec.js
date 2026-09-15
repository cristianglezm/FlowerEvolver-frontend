import { test } from './fixtures';
import { AppMenuController } from './controllers/AppMenuController';
import { LocalViewController } from './controllers/LocalViewController';
import { FlowerCardController } from './controllers/FlowerCardController';

test('create, mutate, and favourite a local flower', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	await local.goto();

	await local.expectFlowerCount(0);

	await menu.newLocalFlower();
	await local.expectFlowerCount(1);

	const card = await local.firstCard();
	await card.expectImageLoaded();
	await card.favourite();

	await card.mutate();
	await local.expectFlowerCount(2);
});

test('selecting two local flowers enables reproduction', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	await local.goto();

	await menu.newLocalFlower();
	await menu.newLocalFlower();
	await local.expectFlowerCount(2);

	const cards = local.cards();
	await new FlowerCardController(page, cards.nth(0)).select();
	await new FlowerCardController(page, cards.nth(1)).select();

	await menu.localReproduce();
	await local.expectFlowerCount(3);
});
