import { useSpeciesStore } from '../stores/SpeciesStore';
import { useCaptionerStore } from '../stores/CaptionerStore';

/**
 * What the card of a flower of the browser needs besides the flower, for the flowers that a list shows: the species,
 * and the description that is the text of its image. A view calls the function it returns from the `onLoaded` of its
 * list, with the flowers of the page or the batch. A flower that is made is not one of them: the store that makes it
 * classifies it.
 *
 * @returns {Function} (flowers) => Promise, done when the descriptions are in the store
 */
export const useShownFlowers = () => {
    const SpeciesStore = useSpeciesStore();
    const CaptionerStore = useCaptionerStore();
    return (flowers) => {
        const ids = flowers.map((flower) => flower.id);
        SpeciesStore.ensureFor(ids);
        return CaptionerStore.loadLocalDescriptionsOf(ids);
    };
};
