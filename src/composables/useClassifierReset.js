import { computed, inject } from 'vue';
import { useSpeciesStore } from '../stores/SpeciesStore';
import { canResetClassifier, resetQuestion } from '../services/speciesQuestions';

/**
 * @brief Going back to the classifier built into the wasm, for the two places that offer it: the
 * Species tab and the Danger Zone of the settings. The rule for when it is possible and what is asked
 * before doing it are the same in both.
 *
 * @example
 * const { canReset, askReset } = useClassifierReset();
 * // <button :disabled="!canReset" @click="askReset()">
 */
export const useClassifierReset = () => {
    const emitter = inject('emitter');
    const SpeciesStore = useSpeciesStore();

    // there has to be a fine-tuned classifier, and it cannot be replaced while it is being used
    const canReset = computed(() => canResetClassifier(SpeciesStore));
    const askReset = () => {
        emitter.emit('showYesNo', {
            ...resetQuestion(),
            onConfirm: async () => {
                await SpeciesStore.resetClassifier();
            },
        });
    };
    return { canReset, askReset };
};
