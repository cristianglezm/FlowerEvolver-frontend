import { test } from './fixtures';
import { LocalViewController } from './controllers/LocalViewController';
import { SettingsController } from './controllers/SettingsController';
import { getFlowerEvolver } from '../../src/services/flowerEvolver';

test('importing a single flower file adds it to Local flowers', async ({ page }) => {
	// import.worker.js re-stringifies the uploaded JSON as-is and re-draws it
	// via FE.drawFlower() (see importFlower() in the worker), so the fixture
	// has to be a real, wasm-valid genome - not hand-written JSON. Generating
	// it with the actual service is the
	// only way to get one that's guaranteed valid.
	const fe = await getFlowerEvolver();
	const flower = await fe.makeFlower();
	const genomeJson = flower.genome;

	const local = new LocalViewController(page);
	const settings = new SettingsController(page);

	await local.goto();
	await local.expectFlowerCount(0);

	await settings.goto();
	await page.getByRole('button', { name: 'Import Flowers', exact: true }).click();
	await page.setInputFiles('#uploadFiles', {
		name: 'flower.json',
		mimeType: 'application/json',
		// eslint-disable-next-line no-undef - Buffer is a Node global; this runs in the test's own Node context, not the browser
		buffer: Buffer.from(genomeJson),
	});
	await page.getByRole('button', { name: 'Import Files' }).click();

	// The import worker runs in the background with no completion signal
	// reaching the UI.
	await page.waitForTimeout(3000);
	await local.goto();
	await local.expectFlowerCount(1);
});
