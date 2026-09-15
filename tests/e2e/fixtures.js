import { test as base } from '@playwright/test';

const DEFAULT_SETTINGS = {
	params: { radius: 64, numLayers: 3, P: 6.0, bias: 1.0 },
	mutationRates: { addNodeRate: 0.2, addConnRate: 0.3, removeConnRate: 0.2, perturbWeightsRate: 0.6, enableRate: 0.35, disableRate: 0.3, actTypeRate: 0.4 },
	loadDemoFlowers: false,
	loadCaptionerModel: false,
	loadChatBotModel: false,
	loadKokoroModel: false,
	showChatBot: false,
	pagination: false,
	limit: 100,
	magnification: 4
};

/**
 * Every spec in this suite wants a clean, predictable starting state:
 *
 * - loadDemoFlowers disabled. Without this, views/Local.vue's
 *   loadDemoFlowers() imports the ~42-flower demo set on first visit,
 *   which makes flower-count assertions racy against that background
 *   import instead of deterministic.
 * - the cookie/legal warning banner (AppTitle.vue's #warning, visible
 *   by default) dismissed. It's position: absolute; z-index: 2; width:
 *   100% - on narrow viewports it overlaps and intercepts clicks on the
 *   mobile menu's hamburger icon (menu-toggle), which is otherwise a
 *   real, reproducible click-interception failure, not a flaky one.
 *
 * Override settings per-test/per-file with:
 *   test.use({ settings: { ...DEFAULT_SETTINGS, loadDemoFlowers: true } });
 */
export const test = base.extend({
	settings: [DEFAULT_SETTINGS, { option: true }],
	page: async ({ page, settings }, use) => {
		await page.addInitScript((settingsJson) => {
			// eslint-disable-next-line no-undef -- runs in the browser page context, not Node
			localStorage.setItem('FlowerEvolverSettings', settingsJson);
			// eslint-disable-next-line no-undef -- runs in the browser page context, not Node
			localStorage.setItem('FlowerEvolverShowWarning', 'false');
		}, JSON.stringify(settings));
		await use(page);
	},
});

export { expect } from '@playwright/test';
