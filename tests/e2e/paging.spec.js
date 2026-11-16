import { test, expect, DEFAULT_SETTINGS } from './fixtures';
import { AppMenuController } from './controllers/AppMenuController';
import { LocalViewController } from './controllers/LocalViewController';
import { ListViewController } from './controllers/ListViewController';

// One page at a time: the arrows, the address and the back button. The page is in the address (`?page=`, from 0),
// each page of the arrows is a place in the history, and the view stays while the page changes.
test.use({ settings: { ...DEFAULT_SETTINGS, pagination: true, limit: 3 } });

test.describe('the pages of the Local tab', () => {
	test.beforeEach(async ({ page }) => {
		const menu = new AppMenuController(page);
		const local = new LocalViewController(page);
		await local.goto();
		// a flower that is made is added to the page that is shown, so they are all there until the page is read again
		for(let i = 1; i <= 7; ++i){
			await menu.newLocalFlower();
			await local.expectFlowerCount(i);
		}
	});

	test('the arrows show the page before and the page after, and the page is in the address', async ({ page }) => {
		const list = new ListViewController(page);
		await list.open('/#/Local?page=0');
		await list.expectIds([7, 6, 5]);

		await list.nextPage();
		await list.expectIds([4, 3, 2]);
		await expect(page).toHaveURL(/#\/Local\?page=1$/);

		await list.nextPage();
		await list.expectIds([1]);
		await expect(page).toHaveURL(/#\/Local\?page=2$/);
		await expect(list.nextPageButton()).toBeDisabled();

		await list.prevPage();
		await list.prevPage();
		await list.expectIds([7, 6, 5]);
		await expect(list.prevPageButton()).toBeDisabled();
	});

	test('the view is not loaded again when the page changes', async ({ page }) => {
		const list = new ListViewController(page);
		await list.open('/#/Local?page=0');
		await list.expectIds([7, 6, 5]);
		// the arrow is in the view: if the view were made again it would be another one
		const arrow = await list.nextPageButton().elementHandle();

		await list.nextPage();
		await list.expectIds([4, 3, 2]);
		await list.nextPage();
		await list.expectIds([1]);

		expect(await arrow.evaluate((element) => element.isConnected)).toBe(true);
	});

	test('a page that is opened by its address is the page that is shown, and a reload keeps it', async ({ page }) => {
		const list = new ListViewController(page);

		await list.open('/#/Local?page=1');
		await list.expectIds([4, 3, 2]);

		await page.reload();
		await list.expectIds([4, 3, 2]);
		await expect(page).toHaveURL(/#\/Local\?page=1$/);
	});

	test('the back button shows the page before, and forward the page after', async ({ page }) => {
		const list = new ListViewController(page);
		await list.open('/#/Local?page=0');
		await list.expectIds([7, 6, 5]);
		await list.nextPage();
		await list.nextPage();
		await list.expectIds([1]);

		await page.goBack();
		await list.expectIds([4, 3, 2]);
		await expect(page).toHaveURL(/#\/Local\?page=1$/);

		await page.goBack();
		await list.expectIds([7, 6, 5]);

		await page.goForward();
		await list.expectIds([4, 3, 2]);
	});

	test('a page that is beyond the last one shows the last one', async ({ page }) => {
		const list = new ListViewController(page);

		await list.open('/#/Local?page=9');

		await list.expectIds([1]);
	});

	test('the tab of the navigation goes back to the first page', async ({ page }) => {
		const menu = new AppMenuController(page);
		const list = new ListViewController(page);
		await list.open('/#/Local?page=2');
		await list.expectIds([1]);

		await menu.openTab('Local');

		await list.expectIds([7, 6, 5]);
	});
});
