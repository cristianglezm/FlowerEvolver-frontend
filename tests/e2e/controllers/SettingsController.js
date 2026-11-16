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

	// the garden is drawn by the app when it starts, and keeps its flowers in the session when it is done
	async waitForGarden(){
		await this.page.waitForFunction(() => globalThis.sessionStorage.getItem('FlowerEvolverGarden') !== null, null, { timeout: 90_000 });
	}
}
