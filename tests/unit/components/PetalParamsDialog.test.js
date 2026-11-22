// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { isReactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import PetalParamsDialog from '../../../src/components/PetalParamsDialog.vue';
import { getFlowerEvolver } from '../../../src/services/flowerEvolver';

// What the editor asks of the store is what is looked at here, the store has its own tests with the wasm.
const store = vi.hoisted(() => ({ drawFlowerWithParams: vi.fn(), addFlowerWithParams: vi.fn() }));
const errors = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('../../../src/stores/LocalFlowerStore', () => ({ useLocalFlowerStore: () => store }));
vi.mock('../../../src/stores/ErrorStore', () => ({ useErrorStore: () => errors }));

describe('PetalParamsDialog', () => {
	const GENOME = '{"Flower":{"dna":{},"petals":{"radius":64,"numLayers":3,"P":6,"bias":1}}}';
	const PARAMS = { radius: 64, numLayers: 3, P: 6, bias: 1 };
	let wrapper;
	const mountEditor = (props = {}) => {
		wrapper = mount(PetalParamsDialog, {
			props: { id: 5, genome: GENOME, params: PARAMS, imageSrc: 'data:image/png;base64,NOW', ...props },
			attachTo: document.body,
		});
		return wrapper;
	};
	const byId = (id) => wrapper.get(`[data-testid="${id}"]`);
	const field = (name) => wrapper.get('#edit-' + name);
	const values = () => ['radius', 'num-layers', 'p', 'bias'].map((name) => Number(field(name).element.value));
	const dialog = () => wrapper.get('dialog').element;
	const redraw = () => byId('petal-editor-redraw');
	const save = () => byId('petal-editor-save');
	const reset = () => byId('petal-editor-reset');
	// a draw that the test finishes when it wants
	const deferred = () => {
		let resolve, reject;
		const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
		return { promise, resolve, reject };
	};
	const drawnWith = (params, image = 'data:image/png;base64,DRAWN') => ({ genome: GENOME.replace('64', String(params.radius)), image, params });

	beforeEach(() => {
		vi.clearAllMocks();
		store.drawFlowerWithParams.mockImplementation(async (_, params) => drawnWith(params));
		store.addFlowerWithParams.mockImplementation(async (genome, params) => ({ id: 9, genome: drawnWith(params).genome, image: 'data:image/png;base64,SAVED' }));
	});

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
		document.body.innerHTML = '';
	});

	describe('when it is shown', () => {
		test('opens itself, with the id of the flower in its title, and a × to close it', () => {
			mountEditor();

			expect(dialog().open).toBe(true);
			expect(wrapper.get('h2').text()).toBe('Edit the params of flower 5');
			expect(wrapper.find('.fe-modal-close').exists()).toBe(true);
			expect(byId('petal-editor').element).toBe(dialog());
		});

		test('shows the flower as it is, and asks to redraw to see the other', () => {
			mountEditor();

			expect(byId('petal-editor-now').attributes('src')).toBe('data:image/png;base64,NOW');
			expect(byId('petal-editor-nothing').text()).toBe('Redraw to see it');
			expect(wrapper.find('[data-testid="petal-editor-drawn"]').exists()).toBe(false);
		});

		test('has the four fields with the params of the flower, with the labels of the creation params', () => {
			mountEditor({ params: { radius: 100, numLayers: 5, P: 3.5, bias: -2 } });

			expect(values()).toEqual([100, 5, 3.5, -2]);
			expect(wrapper.findAll('label').map((label) => label.text())).toEqual(['Radius:', 'Number of Layers:', 'P:', 'Bias:']);
		});

		test('has the fields that the creation params of the settings have, with the same ids at the end and the same tooltips', () => {
			mountEditor();

			const tips = wrapper.findAllComponents({ name: 'ToolTip' }).map((tip) => tip.props('info'));
			expect(wrapper.findAll('input[type=number]').map((input) => input.attributes('id'))).toEqual(['edit-radius', 'edit-num-layers', 'edit-p', 'edit-bias']);
			expect(tips).toHaveLength(4);
			expect(tips[0]).toBe('radius of the flower, min: 4 and max: 256, for bigger radius use the desktop app.');
			expect(field('radius').attributes()).toMatchObject({ min: '4', max: '256' });
			expect(field('num-layers').attributes('min')).toBe('1');
		});

		test('has the three buttons, and Save is the one that says new flower', () => {
			mountEditor();

			expect(redraw().text()).toBe('Redraw');
			expect(save().text()).toBe('Save as new flower');
			expect(reset().text()).toBe('Reset');
			expect([redraw(), save(), reset()].every((button) => button.classes().includes('safe-button') && !button.element.disabled)).toBe(true);
			expect(store.drawFlowerWithParams).not.toHaveBeenCalled();
			expect(store.addFlowerWithParams).not.toHaveBeenCalled();
		});

		test('wants what it is given', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

			expect(() => mountEditor({ params: { radius: 64 } })).not.toThrow();

			expect(warn).toHaveBeenCalled();
			warn.mockRestore();
		});
	});

	describe('Redraw', () => {
		test('draws the genome with the params of the fields, as numbers', async () => {
			mountEditor();
			await field('radius').setValue('32');
			await field('p').setValue('4.5');

			await redraw().trigger('click');
			await flushPromises();

			expect(store.drawFlowerWithParams).toHaveBeenCalledExactlyOnceWith(GENOME, { radius: 32, numLayers: 3, P: 4.5, bias: 1 });
		});

		test('gives the store a plain copy of the fields, not the form that goes on changing', async () => {
			mountEditor();

			await redraw().trigger('click');
			await flushPromises();

			expect(isReactive(store.drawFlowerWithParams.mock.calls[0][1])).toBe(false);
		});

		test('draws the genome as it was given, the text of a flower of the server as well', async () => {
			const remote = '{"Flower":{"dna":{"x":1},"petals":{"radius":8,"numLayers":1,"P":2,"bias":0}}}';
			mountEditor({ genome: remote });

			await redraw().trigger('click');
			await flushPromises();

			expect(store.drawFlowerWithParams.mock.calls[0][0]).toBe(remote);
		});

		test('shows the flower that is drawn, next to the one that is, and the fields have the params that were kept', async () => {
			store.drawFlowerWithParams.mockResolvedValue(drawnWith({ radius: 4, numLayers: 2, P: 6, bias: 1 }));
			mountEditor();
			await field('radius').setValue('1');
			await field('num-layers').setValue('20');

			await redraw().trigger('click');
			await flushPromises();

			expect(byId('petal-editor-drawn').attributes('src')).toBe('data:image/png;base64,DRAWN');
			expect(byId('petal-editor-now').attributes('src')).toBe('data:image/png;base64,NOW');
			expect(wrapper.find('[data-testid="petal-editor-nothing"]').exists()).toBe(false);
			expect(values()).toEqual([4, 2, 6, 1]);
			expect(wrapper.findAll('figcaption')[1].text()).toBe('With the params');
			expect(byId('petal-editor-drawn').classes()).not.toContain('stale');
		});

		test('blocks the buttons while it draws, and a second click does not draw twice', async () => {
			const pending = deferred();
			store.drawFlowerWithParams.mockReturnValue(pending.promise);
			mountEditor();

			await redraw().trigger('click');
			expect([redraw(), save(), reset()].map((button) => button.element.disabled)).toEqual([true, true, true]);
			await redraw().trigger('click');
			expect(store.drawFlowerWithParams).toHaveBeenCalledTimes(1);

			pending.resolve(drawnWith(PARAMS));
			await flushPromises();
			expect([redraw(), save(), reset()].map((button) => button.element.disabled)).toEqual([false, false, false]);
		});

		test('says that it could not draw, keeps what was there, and can be tried again', async () => {
			mountEditor();
			await redraw().trigger('click');
			await flushPromises();
			store.drawFlowerWithParams.mockRejectedValueOnce(new Error('wasm'));
			await field('radius').setValue('32');

			await redraw().trigger('click');
			await flushPromises();

			expect(errors.push).toHaveBeenCalledExactlyOnceWith("couldn't draw the flower with those params.");
			expect(byId('petal-editor-drawn').attributes('src')).toBe('data:image/png;base64,DRAWN');
			expect(redraw().element.disabled).toBe(false);
			expect(values()[0]).toBe(32);
		});
	});

	describe('the flower that is drawn', () => {
		const drawn = async () => {
			await redraw().trigger('click');
			await flushPromises();
		};

		test('is marked when a field changes after it: it is not the flower of the params that are shown', async () => {
			mountEditor();
			await drawn();

			await field('bias').setValue('2');

			expect(byId('petal-editor-drawn').classes()).toContain('stale');
			expect(wrapper.findAll('figcaption')[1].text()).toBe('Redraw to update it');
		});

		test('is not marked when the field goes back to what it was', async () => {
			mountEditor();
			await drawn();
			await field('bias').setValue('2');

			await field('bias').setValue('1');

			expect(byId('petal-editor-drawn').classes()).not.toContain('stale');
		});

		test('is the one that is shown again, no longer marked, after a new redraw', async () => {
			mountEditor();
			await drawn();
			await field('bias').setValue('2');

			store.drawFlowerWithParams.mockResolvedValue(drawnWith({ ...PARAMS, bias: 2 }, 'data:image/png;base64,SECOND'));
			await drawn();

			expect(byId('petal-editor-drawn').attributes('src')).toBe('data:image/png;base64,SECOND');
			expect(byId('petal-editor-drawn').classes()).not.toContain('stale');
		});

		test('is not there to be marked before the first redraw', async () => {
			mountEditor();

			await field('bias').setValue('2');

			expect(wrapper.find('[data-testid="petal-editor-drawn"]').exists()).toBe(false);
		});
	});

	describe('the fields', () => {
		test.each([
			['radius', 64],
			['num-layers', 3],
			['p', 6],
			['bias', 1],
		])('%s goes back to the value of the flower when it is left empty', async (name, original) => {
			mountEditor();
			await field(name).setValue('7');

			await field(name).setValue('');

			expect(Number(field(name).element.value)).toBe(original);
		});

		test('a value that is typed and not left yet is drawn as it is typed: the store is the one that limits it', async () => {
			mountEditor();
			// typed, but the field is not left: no change
			field('radius').element.value = '1000';
			await field('radius').trigger('input');

			await redraw().trigger('click');
			await flushPromises();

			expect(store.drawFlowerWithParams.mock.calls[0][1].radius).toBe(1000);
		});
	});

	describe('a field that is left', () => {
		const leave = async (name, text) => {
			field(name).element.value = text;
			await field(name).trigger('input');
			await field(name).trigger('change');
		};
		// what the wasm kept is what the field has, a moment after it is left
		const shows = (name, value) => vi.waitFor(() => expect(field(name).element.value).toBe(value));

		test('is given what the wasm kept, as in the creation params: a radius over 256 is 256, and under 4 is 4', async () => {
			mountEditor();

			await leave('radius', '900');
			await shows('radius', '256');

			await leave('radius', '1');
			await shows('radius', '4');
		});

		test('brings the layers into the limit of the radius when the radius is left', async () => {
			mountEditor();

			await leave('radius', '4');

			await shows('num-layers', '2');
		});

		test('is brought into the limit of the layers: 20 layers at a radius of 64 are 6, and 0 is 1', async () => {
			mountEditor();

			await leave('num-layers', '20');
			await shows('num-layers', '6');

			await leave('num-layers', '0');
			await shows('num-layers', '1');
		});

		test('leaves P and bias as they are typed, the wasm does not limit them', async () => {
			mountEditor();

			await leave('p', '-3.5');
			await leave('bias', '1000000');
			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(values()).toEqual([64, 3, -3.5, 1000000]);
		});

		test('does not draw or keep anything by itself, only checks', async () => {
			mountEditor();

			await leave('radius', '900');
			await shows('radius', '256');

			expect(store.drawFlowerWithParams).not.toHaveBeenCalled();
			expect(store.addFlowerWithParams).not.toHaveBeenCalled();
			expect(errors.push).not.toHaveBeenCalled();
		});

		test('does not block the buttons while it is checked: the click on Redraw is what leaves the field', async () => {
			mountEditor();
			field('radius').element.value = '900';
			await field('radius').trigger('input');

			await field('radius').trigger('change');
			await redraw().trigger('click');
			await flushPromises();

			expect(redraw().element.disabled).toBe(false);
			expect(store.drawFlowerWithParams).toHaveBeenCalledTimes(1);
		});

		test('marks the flower that was drawn as the one of other params when the check changes what the fields say', async () => {
			mountEditor();
			await redraw().trigger('click');
			await flushPromises();

			await leave('radius', '900');
			await shows('radius', '256');

			expect(byId('petal-editor-drawn').classes()).toContain('stale');
		});

		test('does not undo what was typed in another field while the wasm was answering', async () => {
			const fe = await getFlowerEvolver();
			const makePetals = fe.makePetals;
			let open;
			const gate = new Promise((resolve) => { open = resolve; });
			fe.makePetals = async () => { await gate; return makePetals.call(fe); };
			try{
				mountEditor();
				await leave('radius', '900');
				field('p').element.value = '9';
				await field('p').trigger('input');

				open();
				await shows('radius', '256');

				expect(field('p').element.value).toBe('9');
			}finally{
				fe.makePetals = makePetals;
			}
		});

		test('says that it could not check, with the words of the creation params, and keeps what was typed, when the wasm fails', async () => {
			const fe = await getFlowerEvolver();
			const makePetals = fe.makePetals;
			fe.makePetals = async () => { throw new Error('wasm'); };
			try{
				mountEditor();

				await leave('radius', '900');
				await vi.waitFor(() => expect(errors.push).toHaveBeenCalledExactlyOnceWith("couldn't check the params with the wasm."));

				expect(field('radius').element.value).toBe('900');
			}finally{
				fe.makePetals = makePetals;
			}
		});

		test('is what the store is given when the flower is drawn or kept afterwards', async () => {
			mountEditor();
			await leave('radius', '900');
			await shows('radius', '256');

			await redraw().trigger('click');
			await flushPromises();
			await save().trigger('click');
			await flushPromises();

			expect(store.drawFlowerWithParams.mock.calls[0][1]).toMatchObject({ radius: 256 });
			expect(store.addFlowerWithParams.mock.calls[0][1]).toMatchObject({ radius: 256 });
		});

		test('an empty one goes back to the value of the flower, and is checked', async () => {
			mountEditor({ params: { radius: 100, numLayers: 5, P: 3, bias: 0.5 } });

			await leave('radius', '');

			await shows('radius', '100');
		});
	});

	describe('Save as new flower', () => {
		test('gives the store a plain copy of the fields when it keeps the flower too', async () => {
			mountEditor();

			await save().trigger('click');
			await flushPromises();

			expect(isReactive(store.addFlowerWithParams.mock.calls[0][1])).toBe(false);
		});

		test('keeps the flower with the params of the fields, as it is asked to, and says which it is', async () => {
			mountEditor();
			await field('radius').setValue('32');

			await save().trigger('click');
			await flushPromises();

			expect(store.addFlowerWithParams).toHaveBeenCalledExactlyOnceWith(GENOME, { radius: 32, numLayers: 3, P: 6, bias: 1 });
			expect(byId('petal-editor-saved').text()).toBe('Saved as flower 9, it is in Local.');
		});

		test('shows the flower that was kept, and the params that it has', async () => {
			store.addFlowerWithParams.mockResolvedValue({ id: 9, genome: '{"Flower":{"petals":{"radius":4,"numLayers":2,"P":6,"bias":1}}}', image: 'data:image/png;base64,SAVED' });
			mountEditor();
			await field('radius').setValue('1');

			await save().trigger('click');
			await flushPromises();

			expect(byId('petal-editor-drawn').attributes('src')).toBe('data:image/png;base64,SAVED');
			expect(byId('petal-editor-drawn').classes()).not.toContain('stale');
			expect(values()).toEqual([4, 2, 6, 1]);
			// the fields changed to what was kept, and that is not a change that makes it another flower
			expect(byId('petal-editor-saved').text()).toBe('Saved as flower 9, it is in Local.');
			expect(save().element.disabled).toBe(true);
		});

		test('does not keep it twice: it waits until the params are not the ones of the flower that was kept', async () => {
			mountEditor();
			await save().trigger('click');
			await flushPromises();
			expect(save().element.disabled).toBe(true);

			await save().trigger('click');
			expect(store.addFlowerWithParams).toHaveBeenCalledTimes(1);

			await field('bias').setValue('2');
			expect(save().element.disabled).toBe(false);
			expect(wrapper.find('[data-testid="petal-editor-saved"]').exists()).toBe(false);
			await save().trigger('click');
			await flushPromises();
			expect(store.addFlowerWithParams).toHaveBeenCalledTimes(2);
		});

		test('can keep it again after the params are changed and put back, it is another flower', async () => {
			mountEditor();
			await save().trigger('click');
			await flushPromises();

			await field('bias').setValue('2');
			await field('bias').setValue('1');

			expect(save().element.disabled).toBe(false);
		});

		test('blocks the buttons while it keeps it, and does it once', async () => {
			const pending = deferred();
			store.addFlowerWithParams.mockReturnValue(pending.promise);
			mountEditor();

			await save().trigger('click');
			await save().trigger('click');

			expect([redraw(), save(), reset()].map((button) => button.element.disabled)).toEqual([true, true, true]);
			expect(store.addFlowerWithParams).toHaveBeenCalledTimes(1);
			pending.resolve({ id: 3, genome: GENOME, image: 'i' });
			await flushPromises();
			expect(byId('petal-editor-saved').text()).toBe('Saved as flower 3, it is in Local.');
		});

		test('says nothing when it was not kept, the store says why, and it can be tried again', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			store.addFlowerWithParams.mockResolvedValue(undefined);
			mountEditor();

			await save().trigger('click');
			await flushPromises();

			// nothing went wrong in the editor either: an error in a handler is a warning of the framework
			expect(warn).not.toHaveBeenCalled();
			warn.mockRestore();

			expect(wrapper.find('[data-testid="petal-editor-saved"]').exists()).toBe(false);
			expect(wrapper.find('[data-testid="petal-editor-drawn"]').exists()).toBe(false);
			expect(save().element.disabled).toBe(false);
			expect(errors.push).not.toHaveBeenCalled();
		});

		test('forgets that it was kept when the flower is drawn again', async () => {
			mountEditor();
			await save().trigger('click');
			await flushPromises();

			await redraw().trigger('click');
			await flushPromises();

			expect(wrapper.find('[data-testid="petal-editor-saved"]').exists()).toBe(false);
			expect(save().element.disabled).toBe(false);
		});
	});

	describe('Reset', () => {
		test('puts back the params of the flower, and takes away what was drawn and what was said', async () => {
			mountEditor();
			await field('radius').setValue('32');
			await save().trigger('click');
			await flushPromises();

			await reset().trigger('click');

			expect(values()).toEqual([64, 3, 6, 1]);
			expect(wrapper.find('[data-testid="petal-editor-drawn"]').exists()).toBe(false);
			expect(byId('petal-editor-nothing').exists()).toBe(true);
			expect(wrapper.find('[data-testid="petal-editor-saved"]').exists()).toBe(false);
			expect(save().element.disabled).toBe(false);
		});

		test('does not touch the store', async () => {
			mountEditor();
			await field('radius').setValue('32');

			await reset().trigger('click');

			expect(store.drawFlowerWithParams).not.toHaveBeenCalled();
			expect(store.addFlowerWithParams).not.toHaveBeenCalled();
		});
	});

	describe('closing', () => {
		test('the × closes it, and it says close once', async () => {
			mountEditor();

			await wrapper.get('.fe-modal-close').trigger('click');

			expect(dialog().open).toBe(false);
			expect(wrapper.emitted('close')).toHaveLength(1);
		});

		test('says close when the browser closes it, which is what Esc does', () => {
			mountEditor();

			dialog().dispatchEvent(new Event('close'));

			expect(wrapper.emitted('close')).toHaveLength(1);
		});

		test('does not say close while it is open', () => {
			mountEditor();

			expect(wrapper.emitted('close')).toBeUndefined();
		});

		test('closing it keeps nothing and draws nothing', async () => {
			mountEditor();
			await field('radius').setValue('32');

			await wrapper.get('.fe-modal-close').trigger('click');

			expect(store.addFlowerWithParams).not.toHaveBeenCalled();
			expect(store.drawFlowerWithParams).not.toHaveBeenCalled();
		});
	});
});
