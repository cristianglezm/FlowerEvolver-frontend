/**
 * One controller instance per FlowerCard. `root` must be a Locator already
 * scoped to a single card (e.g. LocalViewController#firstCard()) - every
 * action's main-menu link shares the same data-testid across the local and
 * remote branches.
 */
export class FlowerCardController {
	constructor(page, root){
		this.page = page;
		this.root = root;
	}

	async #openMainMenu(){
		await this.root.getByTestId('flower-menu-toggle').click();
	}

	async mutate(){
		await this.#openMainMenu();
		await this.root.getByTestId('flower-mutate').click();
	}
	async select(){
		await this.#openMainMenu();
		await this.root.getByTestId('flower-select').click();
	}
	async favourite(){
		await this.root.getByTestId('flower-favourite').click();
	}
	async id(){
		return this.root.getAttribute('data-flower-id');
	}
	async expectImageLoaded(){
		const img = this.root.locator('img.FlowerImage');
		await this.page.waitForFunction(
			(el) => el.complete && el.naturalWidth > 0,
			await img.elementHandle()
		);
	}
}
