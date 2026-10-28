import { test, expect } from './fixtures';
import { AppMenuController } from './controllers/AppMenuController';
import { LocalViewController } from './controllers/LocalViewController';
import { SpeciesViewController } from './controllers/SpeciesViewController';
import { SettingsController } from './controllers/SettingsController';

test('a new local flower gets its species', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const species = new SpeciesViewController(page);
	await local.goto();

	await menu.newLocalFlower();

	await species.expectBadges(1);
	// the name of the species and its cell
	await expect(species.badges().first()).toHaveText(/^[A-Z][a-z]+ [A-Z][a-z]+ \(\d+, \d+\)$/);
});

test('the Species tab counts the flowers of each species and lists the ones of the selected species', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const species = new SpeciesViewController(page);
	await local.goto();
	await menu.newLocalFlower();
	await menu.newLocalFlower();
	await species.expectBadges(2);

	await menu.openSpecies();

	await expect(species.map()).toBeVisible();
	await species.expectSummary(/^2 flowers in [12] of 96 species$/);
	// a species is selected without asking: the busiest, and its flowers are listed
	await expect(species.detailName()).toBeVisible();
	const shown = Number((await species.detailCount().innerText()).split(' ')[0]);
	expect(shown).toBeGreaterThanOrEqual(1);
	await expect(species.cards()).toHaveCount(shown);
});

test('the badge of a flower opens its species, not the busiest one', async ({ page }) => {
	// flowers are drawn and read: close to the default 30 s alone, over it with other tests running
	test.setTimeout(90_000);
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const species = new SpeciesViewController(page);
	await local.goto();
	await menu.newLocalFlower();
	await menu.newLocalFlower();
	await menu.newLocalFlower();
	await species.expectBadges(3);
	// flowers 2 and 3 are in the busiest species, flower 1 is alone in another one
	await species.changeSpecies({ 1: { x: 5, y: 5, d: 1 }, 2: { x: 1, y: 1, d: 1 }, 3: { x: 1, y: 1, d: 1 } });
	await page.reload();
	await species.expectBadges(3);

	await page.locator('[data-flower-id="1"]').getByTestId('species-badge').click();

	await expect(page).toHaveURL(/#\/Species/);
	await expect(species.detailName()).toHaveText('Rounded Dahlia (5, 5)');
	await expect(species.cards()).toHaveCount(1);
});

test('two flowers of a species are used as parents and their child gets a species', async ({ page }) => {
	// flowers are drawn and read: close to the default 30 s alone, over it with other tests running
	test.setTimeout(90_000);
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const species = new SpeciesViewController(page);
	await local.goto();
	await menu.newLocalFlower();
	await menu.newLocalFlower();
	await species.expectBadges(2);
	// both flowers are in one species, so it is the one selected and the parents come from it
	await species.changeSpecies({ 1: { x: 1, y: 1, d: 1 }, 2: { x: 1, y: 1, d: 1 } });
	await page.reload();
	await species.expectBadges(2);
	await menu.openSpecies();
	await expect(species.detailName()).toContainText('(1, 1)');
	await expect(species.parents()).toHaveCount(0);

	await species.useAsParent();
	await expect(species.parents()).toHaveText(/^Parent 1: #[12] \([A-Z][a-z]+ [A-Z][a-z]+ \(1, 1\)\)$/);
	await species.useAsParent();
	await expect(species.parents()).toHaveText(/^Parent 1: #[12] \([^)]+\([^)]+\)\), Parent 2: #[12] \([^)]+\([^)]+\)\)$/);
	await menu.localReproduce();

	// the summary counts the child once it is made and classified, and only then is it safe to leave the tab
	await species.expectSummary(/^3 flowers in /);
	await local.goto();
	await local.expectFlowerCount(3);
	await species.expectBadges(3);
});

test('the species of a flower is worked out once and kept when the app is opened again', async ({ page }) => {
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const species = new SpeciesViewController(page);
	await local.goto();
	await menu.newLocalFlower();
	await species.expectBadges(1);
	// a distance that no classification gives: if the flower was classified again it would be gone
	await species.changeSpecies({ 1: { d: 123.456 } });

	await page.reload();

	await species.expectBadges(1);
	await expect(species.badges().first()).toHaveAttribute('title', /123\.46/);
});

test('a species can be split in sub-species, they filter its flowers and show on the badges, and the split can be removed', async ({ page }) => {
	// the flowers are drawn and read: a few seconds alone, much more with other tests running
	test.setTimeout(180_000);
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const species = new SpeciesViewController(page);
	await local.goto();
	for(let i = 0; i < 8; ++i){
		await menu.newLocalFlower();
	}
	await species.expectBadges(8);
	// all of them are in one species, so it is the one selected and it has what a split needs
	const all = {};
	for(let id = 1; id <= 8; ++id){
		all[id] = { x: 1, y: 1, d: 1 };
	}
	await species.changeSpecies(all);
	await page.reload();
	await species.expectBadges(8);
	await menu.openSpecies();
	await expect(species.detailName()).toContainText('(1, 1)');
	await expect(species.subspeciesMap()).toHaveCount(0);

	await species.openSplit();
	await species.setSplit({ columns: 2, rows: 1, epochs: 1 });
	await species.startSplit();
	await species.expectSplit();
	await species.closeSplit();

	// two sub-species with the 8 flowers between them, and every flower in the list says which
	await expect(species.subspeciesMap()).toBeVisible();
	await expect(species.subCards()).toHaveCount(2);
	const counts = await species.subCounts();
	expect(counts.reduce((a, b) => a + b, 0)).toBe(8);
	await expect(species.subBadges()).toHaveCount(8);

	// choosing one shows its flowers only
	const chosen = counts.findIndex((n) => n > 0);
	await species.subCards().nth(chosen).click();
	await expect(species.cards()).toHaveCount(counts[chosen]);
	await expect(species.subBadges()).toHaveCount(counts[chosen]);

	// the split is kept when the app is opened again
	await page.reload();
	await expect(species.subspeciesMap()).toBeVisible({ timeout: 60_000 });
	await expect(species.subCards()).toHaveCount(2);

	await species.unsplit();
	await expect(species.subspeciesMap()).toHaveCount(0);
	await expect(species.subBadges()).toHaveCount(0);
	await expect(species.cards()).toHaveCount(8);
});

test('the classifier can be fine-tuned, is kept when the app is opened again, and can be removed from the settings', async ({ page }) => {
	// every flower is drawn and classified several times: a few seconds alone, much more with other tests running
	test.setTimeout(180_000);
	const menu = new AppMenuController(page);
	const local = new LocalViewController(page);
	const species = new SpeciesViewController(page);
	const settings = new SettingsController(page);
	await local.goto();
	await menu.newLocalFlower();
	await menu.newLocalFlower();
	await menu.newLocalFlower();
	await species.expectBadges(3);
	await menu.openSpecies();
	await expect(species.resetButton()).toHaveCount(0);

	await species.openFineTune();
	await species.setEpochs(1);
	await species.startFineTune();
	await species.expectFineTuned();
	await species.closeFineTune();

	// the flowers are in species of the new classifier, and there is a way back
	await expect(species.resetButton()).toBeVisible();
	await species.expectSummary(/^3 flowers in \d+ of 96 species/);

	await page.reload();
	await expect(species.resetButton()).toBeVisible({ timeout: 60_000 });
	await species.expectSummary(/^3 flowers in \d+ of 96 species/);

	await settings.goto();
	await expect(settings.removeClassifierButton()).toBeEnabled();
	await settings.removeClassifier();
	await expect(settings.removeClassifierButton()).toBeDisabled();

	// the flowers are classified again for the built-in classifier
	await menu.openSpecies();
	await expect(species.resetButton()).toHaveCount(0);
	await species.expectSummary(/^3 flowers in \d+ of 96 species/);
});
