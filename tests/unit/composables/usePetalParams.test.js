import { describe, test, expect, vi, beforeEach } from 'vitest';
import { isReactive, reactive, nextTick, watch } from 'vue';
import { FEParams } from '@cristianglezm/flower-evolver-wasm';
import { createTestingPinia } from '@pinia/testing';
import { usePetalParams, PETAL_FIELDS, CHECK_FAILED } from '../../../src/composables/usePetalParams';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import { getFlowerEvolver } from '../../../src/services/flowerEvolver';

describe('usePetalParams', () => {
	const START = { radius: 64, numLayers: 3, P: 6, bias: 1 };

	describe('the fields', () => {
		test('are the four of the petals, in the order of the forms, with the end of the id of their input', () => {
			expect(PETAL_FIELDS.map((field) => [field.key, field.id])).toEqual([['radius', 'radius'], ['numLayers', 'num-layers'], ['P', 'p'], ['bias', 'bias']]);
			expect(usePetalParams(START).fields).toBe(PETAL_FIELDS);
		});

		test('have the label and the tooltip that the forms show', () => {
			expect(PETAL_FIELDS.map((field) => field.label)).toEqual(['Radius: ', 'Number of Layers: ', 'P: ', 'Bias: ']);
			expect(PETAL_FIELDS.every((field) => field.tooltip.length > 0)).toBe(true);
			expect(PETAL_FIELDS[0].tooltip).toContain('min: 4 and max: 256');
		});

		test('have the bounds of the spinner of the radius and of the layers, and none for the others', () => {
			expect(PETAL_FIELDS.map((field) => [field.min, field.max])).toEqual([[4, 256], [1, undefined], [undefined, undefined], [undefined, undefined]]);
		});

		test('cannot be changed by a form', () => {
			expect(Object.isFrozen(PETAL_FIELDS)).toBe(true);
			expect(PETAL_FIELDS.every((field) => Object.isFrozen(field))).toBe(true);
		});
	});

	describe('the params', () => {
		test('are a copy of the ones that it starts with, reactive, with the four values and nothing more', () => {
			const initial = { ...START, extra: 'x', id: 7 };

			const { params } = usePetalParams(initial);

			expect(params).toEqual(START);
			expect(isReactive(params)).toBe(true);
			expect(params).not.toBe(initial);
		});

		test('can change without changing the ones that it started with', () => {
			const initial = { ...START };
			const { params } = usePetalParams(initial);

			params.radius = 128;

			expect(initial.radius).toBe(64);
		});

		test('are told to the one that watches them, as a form does', async () => {
			const { params } = usePetalParams(START);
			const seen = [];
			watch(() => params.radius, (radius) => seen.push(radius));

			params.radius = 32;
			await nextTick();

			expect(seen).toEqual([32]);
		});

		test('are of each form: two of them do not share them', () => {
			const one = usePetalParams(START);
			const other = usePetalParams(START);

			one.params.P = 2;

			expect(other.params.P).toBe(6);
		});
	});

	describe('validate', () => {
		test('has a function for each of the four params', () => {
			const { validate } = usePetalParams(START);

			expect(Object.keys(validate).sort()).toEqual(['P', 'bias', 'numLayers', 'radius']);
			expect(Object.values(validate).every((fn) => typeof fn === 'function')).toBe(true);
		});

		test.each(['radius', 'numLayers', 'P', 'bias'])('%s keeps a number as it is typed, it is not limited here', (key) => {
			const { validate } = usePetalParams(START);

			expect(validate[key](12.5)).toBe(12.5);
			expect(validate[key](0)).toBe(0);
			expect(validate[key](-3)).toBe(-3);
			expect(validate[key](1000)).toBe(1000);
		});

		test.each([
			['radius', 64], ['numLayers', 3], ['P', 6], ['bias', 1],
		])('%s takes the value that the form started with when it is left empty or is not a number', (key, started) => {
			const { validate } = usePetalParams(START);

			for(const nothing of ['', null, undefined, 'abc', NaN]){
				expect(validate[key](nothing)).toBe(started);
			}
		});

		test('takes what it is told to take when it is left with nothing, and not what the form has now', () => {
			const { params, validate } = usePetalParams(START, { radius: 32, numLayers: 2, P: 4, bias: 0 });
			params.radius = 128;

			expect(validate.radius('')).toBe(32);
			expect(validate.numLayers('')).toBe(2);
			expect(validate.P('')).toBe(4);
			expect(validate.bias('')).toBe(0);
		});

		test('takes what it is told to take at the moment, the one that was given can change', () => {
			const fallback = reactive({ radius: 32, numLayers: 2, P: 4, bias: 0 });
			const { validate } = usePetalParams(START, fallback);
			expect(validate.radius('')).toBe(32);

			fallback.radius = 100;

			expect(validate.radius('')).toBe(100);
		});

		test('takes the values of the start when it is not told, and they are the ones of then', () => {
			const initial = { ...START };
			const { validate } = usePetalParams(initial);

			initial.radius = 8;

			expect(validate.radius('')).toBe(64);
		});

		test('a zero is a number: it is not what a field with nothing is', () => {
			const { validate } = usePetalParams(START);

			expect(validate.P(0)).toBe(0);
			expect(validate.bias(0)).toBe(0);
		});
	});

	describe('keep', () => {
		test('asks the wasm and puts what it kept in the params, and says what it is', async () => {
			const { params, keep } = usePetalParams(START);
			params.radius = 1;
			params.numLayers = 20;

			const kept = await keep();

			expect(kept).toEqual({ radius: 4, numLayers: 2, P: 6, bias: 1 });
			expect(params).toEqual(kept);
			// what it says is a plain copy of what was kept, not the params of the form that go on changing
			expect(kept).not.toBe(params);
			expect(isReactive(kept)).toBe(false);
		});

		test.each([
			[{ radius: 512, numLayers: 3, P: 6, bias: 1 }, { radius: 256, numLayers: 3, P: 6, bias: 1 }],
			[{ radius: 64, numLayers: 0, P: 6, bias: 1 }, { radius: 64, numLayers: 1, P: 6, bias: 1 }],
			[{ radius: 64, numLayers: 20, P: 6, bias: 1 }, { radius: 64, numLayers: 6, P: 6, bias: 1 }],
			[{ radius: 100, numLayers: 6, P: 6, bias: 1 }, { radius: 100, numLayers: 6, P: 6, bias: 1 }],
		])('%j is %j: the limits are the ones of the wasm', async (typed, expected) => {
			const { params, keep } = usePetalParams(START);
			Object.assign(params, typed);

			await keep();

			expect(params).toEqual(expected);
		});

		test('leaves what is in limits as it is', async () => {
			const { params, keep } = usePetalParams(START);
			Object.assign(params, { radius: 100, numLayers: 5, P: -3.5, bias: 1e9 });

			await keep();

			expect(params).toEqual({ radius: 100, numLayers: 5, P: -3.5, bias: 1e9 });
		});

		test('changes the params that were told to the one that watches them, once they are kept', async () => {
			const { params, keep } = usePetalParams(START);
			params.radius = 1000;
			const seen = [];
			watch(() => params.radius, (radius) => seen.push(radius));

			await keep();
			await nextTick();

			expect(seen).toEqual([256]);
		});

		test('leaves the evolver with the params that it had', async () => {
			const fe = await getFlowerEvolver();
			fe.setParams(new FEParams(32, 2, 4, 0.5));
			const had = fe.getParams();
			const { params, keep } = usePetalParams(START);
			params.radius = 512;

			await keep();

			expect(fe.getParams()).toBe(had);
		});

		test('leaves the params as they were typed when the wasm cannot say, and says why', async () => {
			const fe = await getFlowerEvolver();
			const makePetals = fe.makePetals;
			fe.makePetals = async () => { throw new Error('wasm'); };
			const { params, keep } = usePetalParams(START);
			params.radius = 512;

			try{
				await expect(keep()).rejects.toThrow('wasm');
				expect(params.radius).toBe(512);
			}finally{
				fe.makePetals = makePetals;
			}
		});

		test('does not touch the params that it started with', async () => {
			const initial = { ...START };
			const { params, keep } = usePetalParams(initial);
			params.radius = 512;

			await keep();

			expect(initial).toEqual(START);
		});
	});

	// the wasm is made to answer when the test says, as if it were slow
	const slowWasm = async () => {
		const fe = await getFlowerEvolver();
		const makePetals = fe.makePetals;
		let open;
		const gate = new Promise((resolve) => { open = resolve; });
		fe.makePetals = async () => {
			await gate;
			return makePetals.call(fe);
		};
		return { open, restore: () => { fe.makePetals = makePetals; } };
	};

	describe('keep, while a person goes on typing', () => {
		test('does not give a field that changed since it was asked what was kept of what it had, and gives the others theirs', async () => {
			const { params, keep } = usePetalParams(START);
			const wasm = await slowWasm();
			try{
				params.radius = 900;
				const kept = keep();
				params.P = 9;

				wasm.open();
				await kept;

				expect(params.radius).toBe(256);
				expect(params.P).toBe(9);
			}finally{
				wasm.restore();
			}
		});

		test('still says what was kept of what was asked, all of it, for the one that saves it', async () => {
			const { params, keep } = usePetalParams(START);
			const wasm = await slowWasm();
			try{
				params.radius = 900;
				const kept = keep();
				params.P = 9;

				wasm.open();

				expect(await kept).toEqual({ radius: 256, numLayers: 3, P: 6, bias: 1 });
			}finally{
				wasm.restore();
			}
		});

		test.each(['radius', 'numLayers', 'P', 'bias'])('leaves %s as it is when it is the one that changed', async (key) => {
			const { params, keep } = usePetalParams(START);
			const wasm = await slowWasm();
			try{
				params.radius = 900;
				const kept = keep();
				const changed = key === 'radius' ? 800 : params[key] + 3;
				params[key] = changed;

				wasm.open();
				await kept;

				expect(params[key]).toBe(changed);
			}finally{
				wasm.restore();
			}
		});

		test('gives a field that was typed again with the same value what was kept: it is the one that was asked', async () => {
			const { params, keep } = usePetalParams(START);
			const wasm = await slowWasm();
			try{
				params.radius = 900;
				const kept = keep();
				params.radius = 1;
				params.radius = 900;

				wasm.open();
				await kept;

				expect(params.radius).toBe(256);
			}finally{
				wasm.restore();
			}
		});
	});

	describe('check', () => {
		let errors;
		beforeEach(() => {
			createTestingPinia({ stubActions: true, createSpy: vi.fn });
			errors = useErrorStore();
		});

		test('says what was kept, as keep does, and puts it in the params', async () => {
			const { params, check } = usePetalParams(START);
			params.radius = 1;
			params.numLayers = 20;

			const kept = await check();

			expect(kept).toEqual({ radius: 4, numLayers: 2, P: 6, bias: 1 });
			expect(params).toEqual(kept);
			expect(errors.push).not.toHaveBeenCalled();
		});

		test('says that it could not, once, and gives nothing, when the wasm fails', async () => {
			const fe = await getFlowerEvolver();
			const makePetals = fe.makePetals;
			fe.makePetals = async () => { throw new Error('wasm'); };
			const { params, check } = usePetalParams(START);
			params.radius = 512;

			try{
				const kept = await check();

				expect(kept).toBeUndefined();
				expect(errors.push).toHaveBeenCalledExactlyOnceWith(CHECK_FAILED);
				expect(params.radius).toBe(512);
			}finally{
				fe.makePetals = makePetals;
			}
		});

		test('says it in words that a person can read', () => {
			expect(CHECK_FAILED).toBe("couldn't check the params with the wasm.");
		});

		test('can be asked again after the wasm failed', async () => {
			const fe = await getFlowerEvolver();
			const makePetals = fe.makePetals;
			fe.makePetals = async () => { throw new Error('wasm'); };
			const { params, check } = usePetalParams(START);
			params.radius = 512;
			await check();
			fe.makePetals = makePetals;

			const kept = await check();

			expect(kept.radius).toBe(256);
			expect(params.radius).toBe(256);
		});

		test('does not need the error store until something goes wrong', async () => {
			const { check } = usePetalParams(START);

			await expect(check()).resolves.toEqual(START);
			expect(errors.push).not.toHaveBeenCalled();
		});
	});

	describe('reset', () => {
		test('goes back to the params that it started with', () => {
			const { params, reset } = usePetalParams(START);
			Object.assign(params, { radius: 8, numLayers: 1, P: 0, bias: 0 });

			reset();

			expect(params).toEqual(START);
		});

		test('goes back to what it started with also when the object that it was given has changed since', () => {
			const initial = { ...START };
			const { params, reset } = usePetalParams(initial);
			params.radius = 8;
			initial.radius = 999;

			reset();

			expect(params.radius).toBe(64);
		});

		test('goes to the params that it is given, and not to the ones that it started with', () => {
			const { params, reset } = usePetalParams(START);

			reset({ radius: 32, numLayers: 2, P: 4, bias: 0 });

			expect(params).toEqual({ radius: 32, numLayers: 2, P: 4, bias: 0 });
		});

		test('copies the params that it is given, so they can change without changing the form', () => {
			const { params, reset } = usePetalParams(START);
			const given = { radius: 32, numLayers: 2, P: 4, bias: 0 };

			reset(given);
			given.radius = 999;

			expect(params.radius).toBe(32);
		});

		test('takes the four and nothing that comes with them', () => {
			const { params, reset } = usePetalParams(START);

			reset({ radius: 32, numLayers: 2, P: 4, bias: 0, extra: 'x' });

			expect(Object.keys(params).sort()).toEqual(['P', 'bias', 'numLayers', 'radius']);
		});

		test('goes back to the start that it had, also after it was reset elsewhere', () => {
			const { params, reset } = usePetalParams(START);
			reset({ radius: 32, numLayers: 2, P: 4, bias: 0 });

			reset();

			expect(params).toEqual(START);
		});
	});

	describe('snapshot and isSameAs', () => {
		test('a snapshot is a plain copy of the params, that does not follow them', () => {
			const { params, snapshot } = usePetalParams(START);

			const copy = snapshot();
			params.radius = 128;

			expect(copy).toEqual(START);
			expect(isReactive(copy)).toBe(false);
		});

		test('the params are the same as the ones that they are told, by value', () => {
			const { params, isSameAs } = usePetalParams(START);

			expect(isSameAs({ ...START })).toBe(true);
			params.bias = 2;
			expect(isSameAs(START)).toBe(false);
			expect(isSameAs({ ...START, bias: 2 })).toBe(true);
		});

		test.each(['radius', 'numLayers', 'P', 'bias'])('are not the same when %s is another', (key) => {
			const { isSameAs } = usePetalParams(START);

			expect(isSameAs({ ...START, [key]: START[key] + 1 })).toBe(false);
		});

		test('do not mind what else the ones that they are told have', () => {
			const { isSameAs } = usePetalParams(START);

			expect(isSameAs({ ...START, image: 'x', genome: 'y' })).toBe(true);
		});
	});
});
