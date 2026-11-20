// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FieldRow from '../../../../src/components/ui/FieldRow.vue';

describe('FieldRow', () => {
	const mountRow = (props = {}, slots = {}) => mount(FieldRow, {
		props: { label: 'Limit per Page: ', ...props },
		slots: { default: '<input id="x" class="control">', ...slots },
	});

	test('shows the label as it is given, for the input that it names', () => {
		const label = mountRow({ inputId: 'setLimit' }).get('label');

		expect(label.text()).toBe('Limit per Page:');
		expect(label.attributes('for')).toBe('setLimit');
	});

	test('has the control that is in the slot', () => {
		expect(mountRow().find('.control').exists()).toBe(true);
	});

	test('has a tooltip with what it is told, and none when it is not told anything', () => {
		const withTip = mountRow({ tooltip: 'it is how many' });
		expect(withTip.find('.tipInfo').exists()).toBe(true);

		expect(mountRow().find('.tipInfo').exists()).toBe(false);
		expect(mountRow({ tooltip: '' }).find('.tipInfo').exists()).toBe(false);
	});

	test('the tooltip is before the label, and the label before the control, as in the settings', () => {
		const html = mountRow({ tooltip: 'info', inputId: 'x' }).html();

		expect(html.indexOf('tipInfo')).toBeLessThan(html.indexOf('<label'));
		expect(html.indexOf('<label')).toBeLessThan(html.indexOf('class="control"'));
	});

	test('takes the class and the id that it is given, it is one element', () => {
		const wrapper = mount(FieldRow, { props: { label: 'a' }, attrs: { id: 'limit-settings', class: 'option-box' } });

		expect(wrapper.element.id).toBe('limit-settings');
		expect(wrapper.classes()).toContain('option-box');
		expect(wrapper.classes()).toContain('field-row');
	});
});
