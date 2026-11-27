import { expect } from '@playwright/test';
import { FlowerCardController } from './FlowerCardController';

/**
 * Any tab that shows a list of flowers (Browse, Last Added, Favourites, Mutations, Descendants, and Local too):
 * the cards, their ids in the order they are shown, and the arrows of the pagination.
 */
export class ListViewController {
	constructor(page){
		this.page = page;
	}

	// `hash` is the address inside the app, with its page if it has one: '/#/Browse', '/#/Local?page=2'
	async goto(hash){
		await this.page.goto(hash);
	}

	// the cards of the list. The views of the mutations and of the descendants have cards of their own above it, the
	// flower that was mutated and the parents, which are not part of what is listed.
	// as if the address was opened in a new tab: the app is loaded again, which a `goto` that only changes the hash
	// does not do
	async open(hash){
		await this.page.goto('about:blank');
		await this.page.goto(hash);
	}

	cards(){
		return this.page.getByTestId('flowers-list').getByTestId('flower-card');
	}

	card(index){
		return new FlowerCardController(this.page, this.cards().nth(index));
	}

	async ids(){
		return this.cards().evaluateAll((cards) => cards.map((card) => card.getAttribute('data-flower-id')));
	}

	async expectFlowerCount(count){
		await expect(this.cards()).toHaveCount(count);
	}

	// the ids, as they are shown: the newest flower first
	async expectIds(ids){
		await expect.poll(() => this.ids()).toEqual(ids.map(String));
	}

	// the arrows are above the list and below it; the ones above are the default
	nextPageButton(at = 'top'){
		return this.page.getByTestId(`page-next-${at}`);
	}

	prevPageButton(at = 'top'){
		return this.page.getByTestId(`page-previous-${at}`);
	}

	async nextPage(at = 'top'){
		await this.nextPageButton(at).click();
	}

	async prevPage(at = 'top'){
		await this.prevPageButton(at).click();
	}
}
