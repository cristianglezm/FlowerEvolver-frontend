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

	async deleteAllFlowers(){
		await this.page.getByRole('button', { name: 'Delete All Flowers' }).click();
		await this.#confirm();
	}
}
