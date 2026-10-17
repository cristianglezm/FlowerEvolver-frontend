/**
 * Wraps AppMenu.vue's two layouts behind one interface.
 *
 * AppMenu.vue switches between a mobile layout (hamburger icon that reveals
 * a menu, gated by isMobile() = window.innerWidth <= 1280) and a desktop
 * layout (buttons always visible, floating on the page), see
 * playwright.config.js for the two viewport projects this runs under.
 *
 * The two layouts are mutually exclusive at any given viewport (only one
 * v-if branch is ever true at once), so every action button below carries
 * the *same* data-testid in both layouts.
 */
export class AppMenuController {
	constructor(page){
		this.page = page;
	}

	async #openMobileMenuIfPresent(){
		const toggle = this.page.getByTestId('menu-toggle');
		if(await toggle.isVisible().catch(() => false)){
			await toggle.click();
		}
	}

	async #click(testId){
		await this.#openMobileMenuIfPresent();
		await this.page.getByTestId(testId).click();
	}

	async newLocalFlower(){
		await this.#click('menu-new-local-flower');
	}
	async localReproduce(){
		await this.#click('menu-local-reproduce');
	}
	async showLocalDescendants(){
		await this.#click('menu-show-local-descendants');
	}
	async newRemoteFlower(){
		await this.#click('menu-new-remote-flower');
	}
	async remoteReproduce(){
		await this.#click('menu-remote-reproduce');
	}
	async showRemoteDescendants(){
		await this.#click('menu-show-remote-descendants');
	}
	async toggleChatBot(){
		await this.#click('menu-toggle-chatbot');
	}
	async openSettings(){
		await this.#openMobileMenuIfPresent();
		await this.page.getByRole('link', { name: 'Settings' }).click();
	}
}
