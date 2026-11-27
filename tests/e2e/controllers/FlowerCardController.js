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
	// The p of the secondary menu, and the panel with the params of the petals that it opens. Each click on the + and on
	// the p closes what the one before opened, so what is open is left as it is.
	async openParams(){
		const toggle = this.root.getByTestId('params-toggle');
		if(!(await toggle.isVisible())){
			await this.root.getByTestId('flower-more').click();
		}
		if(!(await this.root.locator('.PetalParams').isVisible())){
			await toggle.click();
		}
	}
	async editParams(){
		await this.openParams();
		await this.root.getByTestId('params-edit').click();
	}
	async useParamsForNewFlowers(){
		await this.openParams();
		await this.root.getByTestId('params-use').click();
	}
	// what the panel says: 'Radius: 64' and so on
	async paramsText(){
		await this.openParams();
		return this.root.locator('.PetalParams').innerText();
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
