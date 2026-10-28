// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PrototypeCanvas from '../../../../src/components/species/PrototypeCanvas.vue';

// jsdom has no canvas, this one only keeps what is put in it
describe('PrototypeCanvas', () => {
    let context;
    let getContext;

    beforeEach(() => {
        context = {
            createImageData: vi.fn((width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) })),
            putImageData: vi.fn(),
        };
        getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    });

    afterEach(() => {
        getContext.mockRestore();
    });

    test('draws each alpha as the transparency of a lightgreen pixel, row by row', () => {
        // the fourth is out of range, and so would be a negative one: a full or an empty pixel
        mount(PrototypeCanvas, { props: { alpha: [0, 1, 0.5, 2, -1, 0.25], size: 2 } });

        expect(context.createImageData).toHaveBeenCalledWith(2, 2);
        const [image] = context.putImageData.mock.calls[0];
        expect(Array.from(image.data.filter((_, i) => i % 4 !== 3))).toEqual(Array(4).fill([144, 238, 144]).flat());
        expect(Array.from(image.data.filter((_, i) => i % 4 === 3))).toEqual([0, 255, 128, 255]);
        expect(context.putImageData.mock.calls[0].slice(1)).toEqual([0, 0]);
    });

    test('is as big in pixels as the silhouette and as big on the page as it is told, with a label', () => {
        const canvas = mount(PrototypeCanvas, { props: { alpha: [0, 0, 0, 0], size: 2, display: 96, label: 'Slender Aster' } }).get('canvas');

        expect(canvas.attributes('width')).toBe('2');
        expect(canvas.attributes('height')).toBe('2');
        expect(canvas.attributes('style')).toContain('width: 96px');
        expect(canvas.attributes('role')).toBe('img');
        expect(canvas.attributes('aria-label')).toBe('Slender Aster');
    });

    test('is drawn again when the silhouette changes', async () => {
        const wrapper = mount(PrototypeCanvas, { props: { alpha: [0, 0, 0, 0], size: 2 } });

        await wrapper.setProps({ alpha: [1, 1, 1, 1] });

        expect(context.putImageData).toHaveBeenCalledTimes(2);
        expect(Array.from(context.putImageData.mock.calls[1][0].data.filter((_, i) => i % 4 === 3))).toEqual([255, 255, 255, 255]);
    });

    test('is left empty, without failing, where there is no canvas', () => {
        getContext.mockReturnValue(null);
        expect(() => mount(PrototypeCanvas, { props: { alpha: [0, 0, 0, 0], size: 2 } })).not.toThrow();
    });
});
