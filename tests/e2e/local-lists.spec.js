import { test, expect } from './fixtures';
import { AppMenuController } from './controllers/AppMenuController';
import { LocalViewController } from './controllers/LocalViewController';
import { ListViewController } from './controllers/ListViewController';

// The tabs that list what belongs to a flower of the browser: its mutations and its descendants. They show what a
// reload of the list would show, also while they are open: a flower that is made is in the list that it belongs to
// and not in the others.

test('the mutations of a flower are in its list, and a mutation of one of them is in the list of that one', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const mutations = new ListViewController(page);
	await local.goto();
	await menu.newLocalFlower();
	await local.expectFlowerCount(1);
	const original = await (await local.firstCard()).id();
	await (await local.firstCard()).mutate();
	await local.expectFlowerCount(2);
	// the newest is the first card
	const mutation = await (await local.firstCard()).id();
	expect(mutation).not.toBe(original);

	await mutations.goto(`/#/Mutations/local/${original}`);
	await mutations.expectIds([mutation]);

	// the card in the list is mutated: the new flower is stored as a mutation of that card
	await mutations.card(0).mutate();
	await mutations.goto(`/#/Mutations/local/${mutation}`);
	await mutations.expectFlowerCount(1);

	// and the list of the first flower is as it was
	await mutations.goto(`/#/Mutations/local/${original}`);
	await mutations.expectIds([mutation]);
});

test('a mutation of the flower that is made while its list is open is in the list', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const mutations = new ListViewController(page);
	await local.goto();
	await menu.newLocalFlower();
	await local.expectFlowerCount(1);
	const original = await (await local.firstCard()).id();

	await mutations.goto(`/#/Mutations/local/${original}`);
	await expect(page.getByText('This Flower Has no Mutations.')).toBeVisible();

	// the flower of the header is the one that was mutated
	await page.locator('.mutFlower').getByTestId('flower-card').getByTestId('flower-menu-toggle').click();
	await page.locator('.mutFlower').getByTestId('flower-card').getByTestId('flower-mutate').click();

	await mutations.expectFlowerCount(1);
});

test('the descendants of a pair are the children of that pair, in the order of the pair', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const descendants = new ListViewController(page);
	await local.goto();
	await menu.newLocalFlower();
	await menu.newLocalFlower();
	await local.expectFlowerCount(2);

	// the first one that is selected is the father: 2 and 1
	await local.card(0).select();
	await local.card(1).select();
	await menu.localReproduce();
	await local.expectFlowerCount(3);

	await menu.showLocalDescendants();

	await expect(page).toHaveURL(/#\/Descendants\/local\/2\/1/);
	await descendants.expectIds([3]);
});

test('a child that is made while the list of its pair is open is in it, and a mutation of it is not', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const descendants = new ListViewController(page);
	await local.goto();
	await menu.newLocalFlower();
	await menu.newLocalFlower();
	await local.expectFlowerCount(2);
	await local.card(0).select();
	await local.card(1).select();
	await menu.localReproduce();
	await local.expectFlowerCount(3);
	await menu.showLocalDescendants();
	await descendants.expectIds([3]);

	// the pair is still selected: another child of the same pair
	await menu.localReproduce();
	await descendants.expectIds([4, 3]);

	// a mutation of a child is a flower of its own, not a child of the pair. Nothing in this list says when it is
	// made, so it is given a moment to be wrongly added, and then the Local tab says that it was made.
	await descendants.card(0).mutate();
	await page.waitForTimeout(1000);
	await descendants.expectIds([4, 3]);
	await menu.openTab('Local');
	await local.expectFlowerCount(5);
	await menu.showLocalDescendants();
	await descendants.expectIds([4, 3]);
});

test('the descendants of one flower are the children where it is the father or the mother', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const descendants = new ListViewController(page);
	await local.goto();
	await menu.newLocalFlower();
	await menu.newLocalFlower();
	await local.expectFlowerCount(2);
	// 2 and 1, and then 1 and 2
	await local.card(0).select();
	await local.card(1).select();
	await menu.localReproduce();
	await local.expectFlowerCount(3);
	await local.card(2).select();
	await local.card(1).select();
	await menu.localReproduce();
	await local.expectFlowerCount(4);

	await descendants.goto('/#/Descendants/local/1');

	await descendants.expectIds([4, 3]);
});
