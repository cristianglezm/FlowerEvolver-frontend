// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import QeChart from '../../../../src/components/species/QeChart.vue';

const mountChart = (values, props = {}) => mount(QeChart, { props: { values, ...props } });
// the points of the line as [x, y] numbers
const line = (wrapper) => wrapper.get('[data-testid="qe-chart-line"]').attributes('points').split(' ').map((point) => point.split(',').map(Number));
const labels = (wrapper) => wrapper.findAll('text.tick').map((text) => text.text());
// the labels of the epochs, not the two values of the axis (they have a decimal point)
const epochLabels = (wrapper) => labels(wrapper).filter((text) => !text.includes('.'));

describe('QeChart', () => {
    test('has a point for each value, and the distance going down goes down in the drawing', () => {
        const wrapper = mountChart([1, 0.8, 0.5]);

        const points = line(wrapper);
        expect(points).toHaveLength(3);
        expect(wrapper.findAll('circle')).toHaveLength(3);
        // x grows with the epoch, y (down the page) grows when the distance gets smaller
        expect(points[0][0]).toBeLessThan(points[1][0]);
        expect(points[1][0]).toBeLessThan(points[2][0]);
        expect(points[0][1]).toBeLessThan(points[1][1]);
        expect(points[1][1]).toBeLessThan(points[2][1]);
    });

    test('says the highest and the lowest value on the axis', () => {
        const wrapper = mountChart([1.234, 0.8, 0.567]);
        expect(wrapper.get('[data-testid="qe-chart-top"]').text()).toBe('1.23');
        expect(wrapper.get('[data-testid="qe-chart-bottom"]').text()).toBe('0.57');
    });

    test('names the first point and numbers the epochs', () => {
        expect(epochLabels(mountChart([1, 0.9, 0.8]))).toEqual(['before', '1', '2']);
        expect(epochLabels(mountChart([1, 0.9], { firstLabel: 'start' }))).toEqual(['start', '1']);
    });

    test('a run too long to label every epoch labels some, and the last', () => {
        const values = Array.from({ length: 40 }, (_, i) => 1 - i * 0.01);
        const axis = epochLabels(mountChart(values));

        expect(axis.length).toBeLessThan(40);
        expect(axis[0]).toBe('before');
        expect(axis.at(-1)).toBe('39');
    });

    test('draws a line in the middle when all the values are the same, and when there is one', () => {
        const same = line(mountChart([0.5, 0.5, 0.5]));
        expect(new Set(same.map(([, y]) => y)).size).toBe(1);
        expect(Number.isFinite(same[0][1])).toBe(true);

        const one = mountChart([0.7]);
        expect(line(one)).toHaveLength(1);
        expect(Number.isFinite(line(one)[0][0])).toBe(true);
        expect(one.attributes('aria-label')).toBe('Mean distance to the species prototype: 0.70');
    });

    test('says in words where it goes', () => {
        expect(mountChart([1, 0.8, 0.5]).attributes('aria-label')).toBe('Mean distance to the species prototype after each epoch, from 1.00 to 0.50');
    });

    test('has smaller dots on a long run', () => {
        expect(mountChart([1, 0.9]).get('circle').attributes('r')).toBe('3.5');
        expect(mountChart(Array.from({ length: 31 }, (_, i) => i)).get('circle').attributes('r')).toBe('2');
    });
});
