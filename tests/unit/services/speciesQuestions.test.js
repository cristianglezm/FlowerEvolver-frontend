import { describe, test, expect } from 'vitest';
import { canResetClassifier, resetQuestion, unsplitQuestion, CLASSIFYING } from '../../../src/services/speciesQuestions';

describe('speciesQuestions', () => {
    const store = (extra) => ({ hasTuned: true, isTuning: false, status: 'idle', ...extra });

    test('the classifier can be reset when there is a fine-tuned one and nothing is using it', () => {
        expect(canResetClassifier(store({}))).toBe(true);
        expect(canResetClassifier(store({ hasTuned: false }))).toBe(false);
        expect(canResetClassifier(store({ isTuning: true }))).toBe(false);
        expect(canResetClassifier(store({ status: 'classifying' }))).toBe(false);
    });

    test('the questions say what is removed and what stays', () => {
        expect(resetQuestion()).toEqual({
            title: 'remove the fine-tuned classifier',
            message: 'Go back to the built-in classifier? The fine-tuning and the sub-species are removed, your flowers stay and are classified again.',
            btnNo: 'no',
            btnYes: 'Remove it',
        });
        expect(unsplitQuestion('Spiral Iris')).toEqual({
            title: 'remove the sub-species',
            message: 'Remove the sub-species of Spiral Iris? The flowers stay in the species.',
            btnNo: 'no',
            btnYes: 'Remove them',
        });
    });

    test('a question is a new object each time, so a caller can add to it', () => {
        expect(resetQuestion()).not.toBe(resetQuestion());
        expect(CLASSIFYING).toBe('Your flowers are still being classified, try again in a moment.');
    });
});
