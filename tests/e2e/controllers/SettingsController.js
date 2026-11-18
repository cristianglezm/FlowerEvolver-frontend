import { expect } from '@playwright/test';
/**
 * The Settings view (Settings.vue) hosts AppActions.vue, which is where
 * export/import/delete-all-flowers live.
 */
export class SettingsController {
	constructor(page){
		this.page = page;
	}

	async goto(){
		await this.page.goto('/#/Settings');
	}

	async #confirm(){
		await this.page.locator('#globalConfirm').getByTestId('confirm-yes').click();
	}

	async exportLocalFlowers(){
		await this.page.getByRole('button', { name: 'Export local Flowers' }).click();
		await this.#confirm();
	}

	async exportFavouriteFlowers(){
		await this.page.getByRole('button', { name: 'Export favourite flowers' }).click();
		await this.#confirm();
	}

	removeClassifierButton(){
		return this.page.getByTestId('remove-classifier');
	}

	async removeClassifier(){
		await this.removeClassifierButton().click();
		await this.#confirm();
	}

	async deleteAllFlowers(){
		await this.page.getByRole('button', { name: 'Delete All Flowers' }).click();
		await this.#confirm();
	}

	async deleteNonFavourites(){
		await this.page.getByRole('button', { name: 'Delete non Favourites' }).click();
		await this.#confirm();
	}

	async importGardenFlowers(){
		await this.page.getByRole('button', { name: 'Import garden Flowers' }).click();
	}

	// how many flowers are in the database of the browser
	async flowersInDatabase(){
		return this.page.evaluate(async () => {
			const db = await new Promise((resolve, reject) => {
				const request = globalThis.indexedDB.open('FlowerEvolver');
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
			try{
				return await new Promise((resolve, reject) => {
					const request = db.transaction('flowers', 'readonly').objectStore('flowers').count();
					request.onsuccess = () => resolve(request.result);
					request.onerror = () => reject(request.error);
				});
			}finally{
				db.close();
			}
		});
	}

	// An import runs in a worker that the tab of the settings ends when it is left, so it is waited for here: there are
	// flowers and no more of them are coming, which is what the database says after it has stopped growing for a while.
	async waitForImportToFinish(){
		let last = -1;
		let steady = 0;
		await expect.poll(async () => {
			const count = await this.flowersInDatabase();
			steady = count > 0 && count === last ? steady + 1 : 0;
			last = count;
			return steady;
		}, { timeout: 120_000, intervals: [500] }).toBeGreaterThanOrEqual(3);
	}

	// the garden is drawn by the app when it starts, and keeps its flowers in the session when it is done
	async waitForGarden(){
		await this.page.waitForFunction(() => globalThis.sessionStorage.getItem('FlowerEvolverGarden') !== null, null, { timeout: 90_000 });
	}
}
