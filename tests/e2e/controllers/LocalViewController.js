import { expect } from '@playwright/test';
import { FlowerCardController } from './FlowerCardController';

export class LocalViewController {
	constructor(page){
		this.page = page;
	}

	async goto(){
		await this.page.goto('/#/Local');
	}

	cards(){
		return this.page.getByTestId('flower-card');
	}

	card(index){
		return new FlowerCardController(this.page, this.cards().nth(index));
	}

	async firstCard(){
		return new FlowerCardController(this.page, this.cards().first());
	}

	async expectFlowerCount(count){
		await expect(this.cards()).toHaveCount(count);
	}
}
