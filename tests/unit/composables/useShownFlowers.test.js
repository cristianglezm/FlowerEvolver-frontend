import { describe, test, expect, beforeEach, vi } from 'vitest';
import { useShownFlowers } from '../../../src/composables/useShownFlowers';

// The two stores are what a card needs, what is checked here is what they are asked, and for which flowers.
const speciesStore = vi.hoisted(() => ({ ensureFor: vi.fn() }));
const captionerStore = vi.hoisted(() => ({ loadLocalDescriptionsOf: vi.fn() }));
vi.mock('../../../src/stores/SpeciesStore', () => ({ useSpeciesStore: () => speciesStore }));
vi.mock('../../../src/stores/CaptionerStore', () => ({ useCaptionerStore: () => captionerStore }));

describe('useShownFlowers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		captionerStore.loadLocalDescriptionsOf.mockResolvedValue();
	});

	test('asks for the species and the description of the flowers, by their ids and in their order', async () => {
		const whenShown = useShownFlowers();

		await whenShown([{ id: 9, genome: 'g' }, { id: 4, genome: 'h' }, { id: 7 }]);

		expect(speciesStore.ensureFor).toHaveBeenCalledExactlyOnceWith([9, 4, 7]);
		expect(captionerStore.loadLocalDescriptionsOf).toHaveBeenCalledExactlyOnceWith([9, 4, 7]);
	});

	test('is done when the descriptions are in the store, and does not wait for the species', async () => {
		let described;
		captionerStore.loadLocalDescriptionsOf.mockReturnValue(new Promise((resolve) => { described = resolve; }));
		speciesStore.ensureFor.mockReturnValue(new Promise(() => {}));
		let done = false;

		const finished = useShownFlowers()([{ id: 1 }]).then(() => { done = true; });
		await Promise.resolve();
		expect(done).toBe(false);

		described();
		await finished;
		expect(done).toBe(true);
	});

	test('asks for each call what it is given, and nothing that it was given before', () => {
		const whenShown = useShownFlowers();

		whenShown([{ id: 1 }, { id: 2 }]);
		whenShown([{ id: 3 }]);

		expect(speciesStore.ensureFor.mock.calls).toEqual([[[1, 2]], [[3]]]);
		expect(captionerStore.loadLocalDescriptionsOf.mock.calls).toEqual([[[1, 2]], [[3]]]);
	});
});
