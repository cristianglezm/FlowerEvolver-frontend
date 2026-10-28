// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import OccupancyGrid from '../../../../src/components/species/OccupancyGrid.vue';

const mountGrid = (counts, props = {}) => mount(OccupancyGrid, { props: { counts, width: 3, height: 2, ...props } });

describe('OccupancyGrid', () => {
    test('has a square for each species, in as many columns as the classifier has', () => {
        const wrapper = mountGrid([0, 1, 2, 3, 4, 5]);

        expect(wrapper.findAll('i')).toHaveLength(6);
        expect(wrapper.attributes('style')).toContain('repeat(3, 14px)');
    });

    test('is black where there are no flowers and lighter the more there are', () => {
        const colors = mountGrid([0, 1, 4]).findAll('i').map((square) => square.element.style.background);

        expect(colors[0]).toBe('rgb(11, 11, 11)');
        const light = (color) => Number(color.match(/\d+/g)[1]);
        expect(light(colors[1])).toBeGreaterThan(80);
        expect(light(colors[2])).toBeGreaterThan(light(colors[1]));
        expect(light(colors[2])).toBe(250);
    });

    test('says how many flowers and where, in the title of each square', () => {
        const titles = mountGrid([0, 1, 2, 3, 4, 5]).findAll('i').map((square) => square.attributes('title'));

        expect(titles[0]).toBe('0 flowers at 0, 0');
        expect(titles[1]).toBe('1 flower at 1, 0');
        expect(titles[5]).toBe('5 flowers at 2, 1');
    });

    test('only has the species of the classifier when it is given more counts', () => {
        expect(mountGrid([1, 1, 1, 1, 1, 1, 9, 9]).findAll('i')).toHaveLength(6);
    });

    test('the size of a square and the label can be chosen', () => {
        const wrapper = mountGrid([1, 2, 3, 4, 5, 6], { cell: 28, label: 'Flowers of each species now' });

        expect(wrapper.attributes('style')).toContain('repeat(3, 28px)');
        expect(wrapper.attributes('style')).toContain('--cell: 28px');
        expect(wrapper.attributes('aria-label')).toBe('Flowers of each species now');
        expect(wrapper.attributes('role')).toBe('img');
    });

    test('with no flowers at all every square is black, there is nothing to divide by', () => {
        const colors = mountGrid([0, 0, 0, 0, 0, 0]).findAll('i').map((square) => square.element.style.background);
        expect(new Set(colors)).toEqual(new Set(['rgb(11, 11, 11)']));
    });
});
