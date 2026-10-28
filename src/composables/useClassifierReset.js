import { computed, inject } from 'vue';
import { useSpeciesStore } from '../stores/SpeciesStore';

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
    const canReset = computed(() => SpeciesStore.hasTuned && !SpeciesStore.isTuning && SpeciesStore.status !== 'classifying');
    const askReset = () => {
        emitter.emit('showYesNo', {
            title: 'remove the fine-tuned classifier',
            message: 'Go back to the built-in classifier? The fine-tuning and the sub-species are removed, your flowers stay and are classified again.',
            btnNo: 'no',
            btnYes: 'Remove it',
            onConfirm: async () => {
                await SpeciesStore.resetClassifier();
            },
        });
    };
    return { canReset, askReset };
};
