import { test, expect, DEFAULT_SETTINGS } from './fixtures';
import { AppMenuController } from './controllers/AppMenuController';
import { LocalViewController } from './controllers/LocalViewController';
import { FlowerCardController } from './controllers/FlowerCardController';

// the image of a flower is two radiuses wide and three high
const width = (locator) => locator.evaluate((img) => img.naturalWidth);
const editor = (page) => page.getByTestId('petal-editor');
const field = (page, name) => page.locator('#edit-' + name);

test('the params of a flower can be changed, drawn, and kept as a new flower', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	await local.goto();
	await menu.newLocalFlower();
	await local.expectFlowerCount(1);
	const original = await local.firstCard();
	const originalId = await original.id();

	await original.editParams();

	await expect(editor(page)).toBeVisible();
	await expect(editor(page).getByRole('heading', { name: `Edit the params of flower ${originalId}` })).toBeVisible();
	await expect(field(page, 'radius')).toHaveValue(String(DEFAULT_SETTINGS.params.radius));
	await expect(page.getByTestId('petal-editor-nothing')).toBeVisible();

	await field(page, 'radius').fill('32');
	await field(page, 'radius').blur();
	await page.getByTestId('petal-editor-redraw').click();

	const drawn = page.getByTestId('petal-editor-drawn');
	await expect(drawn).toBeVisible();
	await expect.poll(() => width(drawn)).toBe(64);
	await expect.poll(() => width(page.getByTestId('petal-editor-now'))).toBe(DEFAULT_SETTINGS.params.radius * 2);
	await expect(field(page, 'radius')).toHaveValue('32');

	await page.getByTestId('petal-editor-save').click();
	await expect(page.getByTestId('petal-editor-saved')).toContainText('Saved as flower');
	await expect(page.getByTestId('petal-editor-save')).toBeDisabled();

	await editor(page).locator('.fe-modal-close').click();
	await expect(editor(page)).toHaveCount(0);

	// the new flower is the newest, with the params that were drawn; the one that it comes from is as it was
	await local.expectFlowerCount(2);
	expect(await local.card(0).id()).not.toBe(originalId);
	expect(await local.card(0).paramsText()).toContain('Radius: 32');
	expect(await local.card(1).id()).toBe(originalId);
	expect(await local.card(1).paramsText()).toContain(`Radius: ${DEFAULT_SETTINGS.params.radius}`);
});

test('the params that the editor limits are the ones that are kept: a radius that is too small is made 4', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	await local.goto();
	await menu.newLocalFlower();
	await local.expectFlowerCount(1);

	await (await local.firstCard()).editParams();
	await field(page, 'radius').fill('1');
	await field(page, 'radius').blur();
	await page.getByTestId('petal-editor-redraw').click();

	await expect(field(page, 'radius')).toHaveValue('4');
	await expect.poll(() => width(page.getByTestId('petal-editor-drawn'))).toBe(8);
});

test('closing the editor keeps nothing', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	await local.goto();
	await menu.newLocalFlower();
	await local.expectFlowerCount(1);

	await (await local.firstCard()).editParams();
	await field(page, 'radius').fill('32');
	await field(page, 'radius').blur();
	await page.getByTestId('petal-editor-redraw').click();
	await expect(page.getByTestId('petal-editor-drawn')).toBeVisible();
	await editor(page).locator('.fe-modal-close').click();

	await expect(editor(page)).toHaveCount(0);
	await local.expectFlowerCount(1);
});

test('the params of a flower can be the ones of the flowers that are made after it', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	await local.goto();
	await menu.newLocalFlower();
	await local.expectFlowerCount(1);

	// a flower with other params than the ones that new flowers have
	const first = await local.firstCard();
	await first.editParams();
	await field(page, 'radius').fill('32');
	await field(page, 'radius').blur();
	await page.getByTestId('petal-editor-save').click();
	await expect(page.getByTestId('petal-editor-saved')).toBeVisible();
	await editor(page).locator('.fe-modal-close').click();
	await local.expectFlowerCount(2);
	const other = new FlowerCardController(page, local.cards().first());
	expect(await other.paramsText()).toContain('Radius: 32');

	await other.useParamsForNewFlowers();
	await expect(page.getByTestId('params-used')).toBeVisible();
	await menu.newLocalFlower();

	await local.expectFlowerCount(3);
	expect(await local.card(0).paramsText()).toContain('Radius: 32');
});
