import { expect } from '@playwright/test';

// The species of a flower is worked out in the background by a worker with its own wasm, the first
// one also waits for that to start, so what waits for it gets a long timeout.
const CLASSIFIED = { timeout: 60_000 };

/**
 * The Species view (Species.vue): the map of the classifier, one species in detail and its flowers.
 * The badge of the species is on every card of a local flower, in this view too.
 */
export class SpeciesViewController{
	constructor(page){
		this.page = page;
	}

	async goto(){
		await this.page.goto('/#/Species');
	}

	badges(){
		return this.page.getByTestId('species-badge');
	}

	async expectBadges(count){
		await expect(this.badges()).toHaveCount(count, CLASSIFIED);
	}

	map(){
		return this.page.getByTestId('species-map');
	}

	summary(){
		return this.page.getByTestId('species-summary');
	}

	detailName(){
		return this.page.getByTestId('species-detail-name');
	}

	detailCount(){
		return this.page.getByTestId('species-detail-count');
	}

	async useAsParent(){
		await this.page.getByTestId('species-use-as-parent').click();
	}

	parents(){
		return this.page.getByTestId('species-parents');
	}

	cards(){
		return this.page.getByTestId('species-flowers').getByTestId('flower-card');
	}

	async expectSummary(pattern){
		await expect(this.summary()).toHaveText(pattern, CLASSIFIED);
	}

	async openFineTune(){
		await this.page.getByTestId('species-finetune').click();
	}

	async setEpochs(epochs){
		await this.page.getByTestId('finetune-epochs').fill(String(epochs));
	}

	async startFineTune(){
		await this.page.getByTestId('finetune-start').click();
	}

	// every flower is drawn once and the epochs are run, it takes a while
	async expectFineTuned(){
		await expect(this.page.getByTestId('training-result')).toHaveText(/^Done\./, { timeout: 120_000 });
	}

	async closeFineTune(){
		await this.page.getByTestId('finetune-close').click();
	}

	async openSplit(){
		await this.page.getByTestId('species-split').click();
	}

	async setSplit({ columns, rows, epochs }){
		await this.page.getByTestId('split-columns').fill(String(columns));
		await this.page.getByTestId('split-rows').fill(String(rows));
		await this.page.getByTestId('split-epochs').fill(String(epochs));
	}

	async startSplit(){
		await this.page.getByTestId('split-start').click();
	}

	// the flowers are drawn once and the epochs are run
	async expectSplit(){
		await expect(this.page.getByTestId('training-result')).toHaveText(/^Done: .* is now \d+ sub-species\.$/, { timeout: 120_000 });
	}

	async closeSplit(){
		await this.page.getByTestId('split-close').click();
	}

	subspeciesMap(){
		return this.page.getByTestId('subspecies-map');
	}

	subCards(){
		return this.page.locator('[data-testid^="subspecies-card-"]:not([data-testid$="count"])');
	}

	subBadges(){
		return this.page.getByTestId('species-flowers').getByTestId('species-sub');
	}

	// how many flowers each sub-species of the map has
	async subCounts(){
		return (await this.page.getByTestId('subspecies-card-count').allInnerTexts()).map(Number);
	}

	async unsplit(){
		await this.page.getByTestId('species-unsplit').click();
		await this.page.locator('#globalConfirm').getByTestId('confirm-yes').click();
	}

	resetButton(){
		return this.page.getByTestId('species-reset');
	}

	/**
	 * Changes rows of the species table of the browser, as { id: { x, y, d } } with the fields to change.
	 * A test uses it to know what is in the table, the classifier does not give the same answer twice.
	 */
	async changeSpecies(changes){
		await this.page.evaluate(async (changesById) => {
			const db = await new Promise((resolve, reject) => {
				const request = indexedDB.open('FlowerEvolver');
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
			await new Promise((resolve, reject) => {
				const transaction = db.transaction('species', 'readwrite');
				const store = transaction.objectStore('species');
				for(const [id, change] of Object.entries(changesById)){
					const read = store.get(Number(id));
					read.onsuccess = () => store.put({ ...read.result, ...change });
				}
				transaction.oncomplete = resolve;
				transaction.onerror = () => reject(transaction.error);
			});
			db.close();
		}, changes);
	}
}
