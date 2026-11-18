import { test, expect } from './fixtures';
import { SettingsController } from './controllers/SettingsController';

// The fields of the Settings tab: the numbers in a pill and the sliders. What each one does with the value is
// tried by unit tests; here it is the browser's own handling of a number input and of a range that is looked at,
// and what ends up in the settings that are saved.
//
// The fixture puts its settings in the localStorage every time that a page is loaded, a reload would take what is
// saved away, so what is saved is read from the localStorage as soon as a field is left.
const saved = (page) => page.evaluate(() => JSON.parse(globalThis.localStorage.getItem('FlowerEvolverSettings')));

test.describe('the fields of the settings', () => {
	test.beforeEach(async ({ page }) => {
		await new SettingsController(page).goto();
		await expect(page.locator('#setLimit')).toBeVisible();
	});

	const valueOf = (page, id) => page.locator('.field-row').filter({ has: page.locator(`#${id}`) }).locator('.range-value');

	test('a mutation rate is a slider in percent: the arrows move it one percent at a time, and it is saved from 0 to 1', async ({ page }) => {
		const slider = page.locator('#mutation-addNodeRate');
		await expect(valueOf(page, 'mutation-addNodeRate')).toHaveText('20%');

		await slider.focus();
		for(let i = 0; i < 5; ++i){
			await slider.press('ArrowRight');
		}

		await expect(valueOf(page, 'mutation-addNodeRate')).toHaveText('25%');
		await expect.poll(async () => (await saved(page)).mutationRates.addNodeRate).toBeCloseTo(0.25, 10);

		await slider.press('End');
		await expect(valueOf(page, 'mutation-addNodeRate')).toHaveText('100%');
		await expect.poll(async () => (await saved(page)).mutationRates.addNodeRate).toBe(1);

		await slider.press('Home');
		await expect(valueOf(page, 'mutation-addNodeRate')).toHaveText('0%');
		await expect.poll(async () => (await saved(page)).mutationRates.addNodeRate).toBe(0);
	});

	test('each mutation rate is its own slider, and the others are not changed', async ({ page }) => {
		const slider = page.locator('#mutation-enableRate');
		await slider.focus();
		await slider.press('ArrowLeft');

		await expect(valueOf(page, 'mutation-enableRate')).toHaveText('34%');
		await expect.poll(async () => (await saved(page)).mutationRates.enableRate).toBeCloseTo(0.34, 10);
		const { mutationRates } = await saved(page);
		expect({ ...mutationRates, enableRate: 0 }).toEqual({
			addNodeRate: 0.2, addConnRate: 0.3, removeConnRate: 0.2, perturbWeightsRate: 0.6, enableRate: 0, disableRate: 0.3, actTypeRate: 0.4,
		});
	});

	test('Restore defaults puts the sliders back', async ({ page }) => {
		const slider = page.locator('#mutation-actTypeRate');
		await slider.focus();
		await slider.press('End');
		await expect(valueOf(page, 'mutation-actTypeRate')).toHaveText('100%');

		await page.locator('#mutationRates-settings').getByRole('button', { name: /defaults/i }).click();

		await expect(valueOf(page, 'mutation-actTypeRate')).toHaveText('40%');
		await expect.poll(async () => (await saved(page)).mutationRates.actTypeRate).toBe(0.4);
	});

	test('the limit is saved when the field is left, and goes back to 100 when it is emptied', async ({ page }) => {
		const limit = page.locator('#setLimit');

		await limit.fill('25');
		await limit.blur();
		await expect.poll(async () => (await saved(page)).limit).toBe(25);

		await limit.fill('');
		await limit.blur();
		await expect(limit).toHaveValue('100');
		await expect.poll(async () => (await saved(page)).limit).toBe(100);
	});

	test('the magnification goes from 4 to 16 in steps of 2, and says it with an x', async ({ page }) => {
		const zoom = page.locator('#magnification-range');
		await expect(valueOf(page, 'magnification-range')).toHaveText('4x');

		await zoom.focus();
		await zoom.press('ArrowRight');
		await expect(valueOf(page, 'magnification-range')).toHaveText('6x');
		await expect.poll(async () => (await saved(page)).magnification).toBe(6);

		await zoom.press('End');
		await expect(valueOf(page, 'magnification-range')).toHaveText('16x');
		await expect.poll(async () => (await saved(page)).magnification).toBe(16);

		await zoom.press('Home');
		await expect(valueOf(page, 'magnification-range')).toHaveText('4x');
	});

	test('the radius is brought to the limits when the field is left, and the layers follow it', async ({ page }) => {
		const radius = page.locator('#params-radius');
		const layers = page.locator('#params-num-layers');

		await radius.fill('900');
		await radius.blur();
		await expect(radius).toHaveValue('256');
		await expect.poll(async () => (await saved(page)).params.radius).toBe(256);

		// a radius of 4 can be halved two times
		await radius.fill('4');
		await radius.blur();
		await expect(layers).toHaveValue('2');
		await expect.poll(async () => (await saved(page)).params).toMatchObject({ radius: 4, numLayers: 2 });
	});

	test('the labels are for the fields: a click on the text goes to the field', async ({ page }) => {
		await page.getByText('Limit per Page:').click();
		await expect(page.locator('#setLimit')).toBeFocused();

		await page.getByText('Radius:').first().click();
		await expect(page.locator('#params-radius')).toBeFocused();

		await page.getByText('Add Node Rate:').click();
		await expect(page.locator('#mutation-addNodeRate')).toBeFocused();
	});
});
