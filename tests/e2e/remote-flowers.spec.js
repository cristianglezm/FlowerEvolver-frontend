import { test, expect } from './fixtures';
import { FakeBackend } from './mockBackend';
import { AppMenuController } from './controllers/AppMenuController';
import { ListViewController } from './controllers/ListViewController';

// The flowers of the server: the tabs that list them and the buttons of the menu that make them. The server is
// FakeBackend, which answers what the API client of the app asks, so what is looked at here is the app: what it
// shows, and what it sends.
test.describe('the flowers of the server', () => {
	let backend;

	test.beforeEach(async ({ page }) => {
		backend = new FakeBackend().seed(5);
		await backend.install(page);
	});

	test('Browse shows the flowers of the server, the newest first', async ({ page }) => {
		const browse = new ListViewController(page);

		await browse.goto('/#/Browse');

		await browse.expectFlowerCount(5);
		await browse.expectIds([5, 4, 3, 2, 1]);
		await browse.card(0).expectImageLoaded();
	});

	test('Last Added shows the last flowers of the server', async ({ page }) => {
		const lastAdded = new ListViewController(page);

		await lastAdded.goto('/#/LastAdded');

		await lastAdded.expectIds([5, 4, 3, 2, 1]);
	});

	test('a new remote flower is at the top of Browse, and the server was asked to make it', async ({ page }) => {
		const menu = new AppMenuController(page);
		const browse = new ListViewController(page);
		await browse.goto('/#/Browse');
		await browse.expectFlowerCount(5);

		await menu.newRemoteFlower();

		await browse.expectIds([6, 5, 4, 3, 2, 1]);
		expect(backend.sent('POST', 'flowers')).toHaveLength(1);
	});

	test('two selected flowers are reproduced, the first one selected is the father', async ({ page }) => {
		const menu = new AppMenuController(page);
		const browse = new ListViewController(page);
		await browse.goto('/#/Browse');
		await browse.expectFlowerCount(5);

		await browse.card(0).select();
		await browse.card(1).select();
		await menu.remoteReproduce();

		await browse.expectIds([6, 5, 4, 3, 2, 1]);
		expect(backend.sent('POST', 'descendants').map((request) => request.body)).toEqual([{ father: 5, mother: 4 }]);
	});

	test('reproducing with no flowers selected sends nothing and says so', async ({ page }) => {
		const menu = new AppMenuController(page);
		const browse = new ListViewController(page);
		await browse.goto('/#/Browse');
		await browse.expectFlowerCount(5);

		await menu.remoteReproduce();

		await expect(page.getByText('There are no flowers selected')).toBeVisible();
		expect(backend.sent('POST', 'descendants')).toHaveLength(0);
		await browse.expectFlowerCount(5);
	});

	test('a mutation of a flower of the server is at the top, and is a mutation of that flower', async ({ page }) => {
		const browse = new ListViewController(page);
		await browse.goto('/#/Browse');
		await browse.expectFlowerCount(5);

		await browse.card(2).mutate();

		await browse.expectIds([6, 5, 4, 3, 2, 1]);
		expect(backend.sent('POST', 'mutations').map((request) => request.body)).toEqual([{ original: 3 }]);
	});

	test('the descendants of the selected pair are the children of that pair', async ({ page }) => {
		backend.addChild(5, 4);
		backend.addChild(4, 5);
		const menu = new AppMenuController(page);
		const browse = new ListViewController(page);
		await browse.goto('/#/Browse');
		await browse.card(0).select();
		await browse.card(1).select();

		await menu.showRemoteDescendants();

		await expect(page).toHaveURL(/#\/Descendants\/remote\/5\/4/);
		// the child of 5 and 4, and not the one of 4 and 5
		await browse.expectIds([6]);
	});

	test('the mutations of a flower of the server are the ones of that flower', async ({ page }) => {
		backend.addMutation(2);
		backend.addMutation(3);
		const mutations = new ListViewController(page);

		await mutations.goto('/#/Mutations/remote/2');

		await mutations.expectIds([6]);
	});

	test('a mutation of a mutation is not in the list of the first flower', async ({ page }) => {
		const mutation = backend.addMutation(2);
		const mutations = new ListViewController(page);
		await mutations.goto('/#/Mutations/remote/2');
		await mutations.expectIds([mutation.id]);

		await mutations.card(0).mutate();

		// the new flower is a mutation of the mutation: it is not shown here, and was not a mutation of flower 2
		await expect.poll(() => backend.sent('POST', 'mutations').length).toBe(1);
		await mutations.expectIds([mutation.id]);
	});

	test('with the server offline nothing is added, and the app says so', async ({ page }) => {
		const menu = new AppMenuController(page);
		const browse = new ListViewController(page);
		await browse.goto('/#/Browse');
		await browse.expectFlowerCount(5);
		backend.offline = true;

		await menu.newRemoteFlower();

		await expect(page.getByText('cannot make a remote flower, server offline')).toBeVisible();
		await browse.expectFlowerCount(5);
	});

	test('Browse with the server offline is empty, and does not show an error', async ({ page }) => {
		backend.offline = true;
		const browse = new ListViewController(page);

		await browse.goto('/#/Browse');

		await browse.expectFlowerCount(0);
		await expect(page.locator('.ErrorModal')).toHaveCount(0);
	});
});
