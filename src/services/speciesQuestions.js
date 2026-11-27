// What is asked before the classifier or a split is thrown away, and when the classifier can be reset. The buttons
// of the application and the commands of the chatbot ask the same thing, so it is written once.

/** @brief The classifier built into the wasm can come back only when there is a fine-tuned one that nothing is using. */
export const canResetClassifier = (speciesStore) => {
    return speciesStore.hasTuned && !speciesStore.isTuning && speciesStore.status !== 'classifying';
};

export const resetQuestion = () => ({
    title: 'remove the fine-tuned classifier',
    message: 'Go back to the built-in classifier? The fine-tuning and the sub-species are removed, your flowers stay and are classified again.',
    btnNo: 'no',
    btnYes: 'Remove it',
});

export const unsplitQuestion = (name) => ({
    title: 'remove the sub-species',
    message: `Remove the sub-species of ${name}? The flowers stay in the species.`,
    btnNo: 'no',
    btnYes: 'Remove them',
});

export const CLASSIFYING = 'Your flowers are still being classified, try again in a moment.';
