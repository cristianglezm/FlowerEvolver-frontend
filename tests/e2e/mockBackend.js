/**
 * The server of the flowers, in memory, for the specs of the tabs that need one (Browse, Last Added, the remote
 * flowers of the menu, the mutations and the descendants of the server).
 *
 * It answers what src/services/flowerApiClient.js asks, on any host: the address of the backend is a build setting
 * (`BACKEND` in .env), and what is matched here is the path, `/api/`, and the images of the cards, `/generated/`.
 * The flowers are newest first, as the real one lists them. Every request is kept in `requests`, to look at what
 * the app sent.
 *
 *   const backend = new FakeBackend().seed(5);
 *   await backend.install(page);       // before the first page.goto
 */

import { Buffer } from 'node:buffer';
import { URL } from 'node:url';

// a 1x1 png, the flowers of the server only need an image that loads
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
// the app and the server are different origins
const CORS = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers': '*',
	'access-control-allow-methods': 'GET,POST,OPTIONS',
};

export class FakeBackend {
	flowers = [];
	mutations = [];
	descendants = [];
	requests = [];
	// true: the server cannot be reached
	offline = false;

	constructor(){
		this.seq = 0;
	}

	#flower(){
		const id = ++this.seq;
		const flower = { id, genome: `${id}.json`, image: `${id}.png` };
		this.flowers.push(flower);
		return flower;
	}

	seed(count){
		for(let i = 0; i < count; ++i){
			this.#flower();
		}
		return this;
	}

	addMutation(original){
		const flower = this.#flower();
		this.mutations.push({ id: flower.id, original });
		return flower;
	}

	addChild(father, mother){
		const flower = this.#flower();
		this.descendants.push({ id: flower.id, father, mother });
		return flower;
	}

	// what the app sent to a path, in order
	sent(method, path){
		return this.requests.filter((request) => request.method === method && request.path === path);
	}

	#byId(ids){
		return ids.map((id) => this.flowers.find((flower) => flower.id === id));
	}

	#page(flowers, query){
		const limit = Number(query.get('limit'));
		const offset = Number(query.get('offset'));
		return [...flowers].sort((a, b) => b.id - a.id).slice(offset, offset + limit);
	}

	#answer(method, parts, query, body){
		const [resource, a, b] = parts;
		if(resource === 'flowers' && method === 'GET'){
			return query.has('count') ? { count: this.flowers.length } : { flowers: this.#page(this.flowers, query) };
		}
		if(resource === 'flowers' && method === 'POST'){
			// `{}` makes a flower, anything else is a flower that is shared
			return body !== null && typeof body === 'object' && Object.keys(body).length === 0 ? this.#flower() : {};
		}
		if(resource === 'descendants' && method === 'POST'){
			return this.addChild(body.father, body.mother);
		}
		if(resource === 'mutations' && method === 'POST'){
			return this.addMutation(body.original);
		}
		if(resource === 'mutations' && method === 'GET'){
			const ids = this.mutations.filter((m) => m.original === Number(a)).map((m) => m.id);
			return query.has('count') ? { count: ids.length } : this.#page(this.#byId(ids), query);
		}
		if(resource === 'descendants' && method === 'GET'){
			const children = this.descendants.filter((d) => b === undefined
				? (d.father === Number(a) || d.mother === Number(a))
				: (d.father === Number(a) && d.mother === Number(b)));
			const ids = children.map((d) => d.id);
			return query.has('count') ? { count: ids.length } : this.#page(this.#byId(ids), query);
		}
		return null;
	}

	/**
	 * What the server says to a request of the app: { status, body } (body is the json that it answers), or null when
	 * it cannot be reached. The specs get it through install(), it is here by itself so that it can be tried
	 * without a browser.
	 */
	respond({ method, url, body }){
		if(this.offline){
			return null;
		}
		const address = new URL(url, 'http://backend.test');
		const path = address.pathname.replace(/^.*\/api\//, '');
		this.requests.push({ method, path, body });
		const answer = this.#answer(method, path.split('/'), address.searchParams, body);
		return answer === null ? { status: 404, body: 'not found' } : { status: 200, body: answer };
	}

	async #handle(route){
		const request = route.request();
		const method = request.method();
		if(method === 'OPTIONS'){
			return route.fulfill({ status: 204, headers: CORS });
		}
		const answer = this.respond({ method, url: request.url(), body: method === 'POST' ? request.postDataJSON() : undefined });
		if(answer === null){
			return route.abort('failed');
		}
		if(answer.status !== 200){
			return route.fulfill({ status: answer.status, headers: CORS, body: answer.body });
		}
		return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(answer.body) });
	}

	async install(page){
		await page.route(/\/generated\//, (route) => route.fulfill({ status: 200, headers: CORS, contentType: 'image/png', body: PNG }));
		await page.route(/\/api\//, (route) => this.#handle(route));
	}
}
