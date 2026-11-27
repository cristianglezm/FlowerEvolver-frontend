// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from 'vitest';
import { isReactive } from 'vue';
import { mount } from '@vue/test-utils';
import PetalParams from '../../../src/components/PetalParams.vue';
import SafeButton from '../../../src/components/ui/SafeButton.vue';

describe('PetalParams', () => {
	const PANEL = { template: '<div class="panel"><slot /></div>' };
	const PARAMS = { radius: 64, numLayers: 3, P: 6, bias: 1 };
	let wrapper;
	const mountParams = (params = PARAMS) => {
		wrapper = mount(PetalParams, { props: { params }, global: { stubs: { FloatingPanel: PANEL } } });
		return wrapper;
	};
	const icon = () => wrapper.get('.pIcon');
	const panel = () => wrapper.find('.PetalParams');

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
	});

	test('is the p, and shows nothing until it is clicked', () => {
		mountParams();

		expect(icon().text()).toBe('p');
		expect(panel().exists()).toBe(false);
	});

	test('shows the four params when the p is clicked, the decimals of P and bias with two places', async () => {
		mountParams({ radius: 100, numLayers: 5, P: 3.456, bias: 0.5 });

		await icon().trigger('click');

		expect(wrapper.get('h2').text()).toBe('Parameters');
		expect(panel().findAll('p').map((line) => line.text())).toEqual(['Radius: 100', 'Number of layers: 5', 'P: 3.46', 'Bias: 0.50']);
	});

	test('hides them when the p is clicked again, and when the × is', async () => {
		mountParams();
		await icon().trigger('click');
		await icon().trigger('click');
		expect(panel().exists()).toBe(false);

		await icon().trigger('click');
		await wrapper.get('.close').trigger('click');
		expect(panel().exists()).toBe(false);
	});

	test('shows the new values when the params change while it is open', async () => {
		mountParams();
		await icon().trigger('click');

		await wrapper.setProps({ params: { radius: 32, numLayers: 2, P: 2, bias: 3 } });

		expect(panel().findAll('p').map((line) => line.text())).toEqual(['Radius: 32', 'Number of layers: 2', 'P: 2.00', 'Bias: 3.00']);
	});

	describe('use for new flowers', () => {
		const useButton = () => wrapper.get('[data-testid="params-use"]');
		const open = async (params, props = {}) => {
			mountParams(params);
			if(Object.keys(props).length > 0){
				await wrapper.setProps(props);
			}
			await icon().trigger('click');
		};

		test('is a green button in the panel, and not before it is opened', async () => {
			mountParams();
			expect(wrapper.find('[data-testid="params-use"]').exists()).toBe(false);

			await icon().trigger('click');

			expect(useButton().text()).toBe('Use for new flowers');
			expect(wrapper.getComponent(SafeButton).exists()).toBe(true);
			expect(wrapper.find('[data-testid="params-used"]').exists()).toBe(false);
		});

		test('says use with the params that it shows, a copy of them, and says what will happen', async () => {
			const params = { radius: 100, numLayers: 5, P: 3.456, bias: 0.5 };
			await open(params);

			await useButton().trigger('click');

			expect(wrapper.emitted('use')).toHaveLength(1);
			const sent = wrapper.emitted('use')[0][0];
			expect(sent).toEqual(params);
			// a copy of the params of the flower, not the reactive ones that the panel shows
			expect(isReactive(sent)).toBe(false);
			sent.radius = 4;
			expect(wrapper.findAll('p')[0].text()).toBe('Radius: 100');
			expect(wrapper.get('[data-testid="params-used"]').text()).toBe('New flowers will have these params.');
		});

		test('says use with the params that it has now, not the ones that it had when it was shown', async () => {
			await open(PARAMS);
			await wrapper.setProps({ params: { radius: 32, numLayers: 2, P: 2, bias: 3 } });

			await useButton().trigger('click');

			expect(wrapper.emitted('use')[0][0]).toEqual({ radius: 32, numLayers: 2, P: 2, bias: 3 });
		});

		test('is disabled, with the attribute, while the params are not the ones of the flower', async () => {
			await open(PARAMS, { known: false });

			await useButton().trigger('click');

			expect(useButton().element.disabled).toBe(true);
			expect(useButton().attributes('title')).toBe('the params of this flower are not known yet');
			expect(wrapper.emitted('use')).toBeUndefined();
			expect(wrapper.find('[data-testid="params-used"]').exists()).toBe(false);
		});

		test('can be used once the params are known', async () => {
			await open(PARAMS, { known: false });

			await wrapper.setProps({ known: true });
			await useButton().trigger('click');

			expect(useButton().element.disabled).toBe(false);
			expect(wrapper.emitted('use')).toHaveLength(1);
		});

		test('says that the params are known when it is not told otherwise', async () => {
			await open(PARAMS);

			expect(useButton().element.disabled).toBe(false);
		});

		test('forgets what it said when it is closed with the × and opened again, and says it again when it is used again', async () => {
			await open(PARAMS);
			await useButton().trigger('click');

			await wrapper.get('.close').trigger('click');
			await icon().trigger('click');
			expect(wrapper.find('[data-testid="params-used"]').exists()).toBe(false);

			await useButton().trigger('click');
			expect(wrapper.get('[data-testid="params-used"]').exists()).toBe(true);
			expect(wrapper.emitted('use')).toHaveLength(2);
		});

		test('forgets it as well when the p closes the panel', async () => {
			await open(PARAMS);
			await useButton().trigger('click');

			await icon().trigger('click');
			await icon().trigger('click');

			expect(wrapper.find('[data-testid="params-used"]').exists()).toBe(false);
		});
	});

	describe('edit', () => {
		const editButton = () => wrapper.get('[data-testid="params-edit"]');

		test('is a green button in the panel, next to the one to use them, and not before it is opened', async () => {
			mountParams();
			expect(wrapper.find('[data-testid="params-edit"]').exists()).toBe(false);

			await icon().trigger('click');

			expect(editButton().text()).toBe('Edit');
			expect(editButton().classes()).toContain('safe-button');
			expect(wrapper.findAll('.actions button').map((button) => button.attributes('data-testid'))).toEqual(['params-use', 'params-edit']);
		});

		test('says edit when it is clicked, and nothing else: the one that has the flower shows the editor', async () => {
			mountParams();
			await icon().trigger('click');

			await editButton().trigger('click');

			expect(wrapper.emitted('edit')).toHaveLength(1);
			expect(wrapper.emitted('use')).toBeUndefined();
			expect(wrapper.find('[data-testid="params-used"]').exists()).toBe(false);
		});

		test('is disabled, with the attribute, while the params are not the ones of the flower', async () => {
			mountParams();
			await wrapper.setProps({ known: false });
			await icon().trigger('click');

			await editButton().trigger('click');

			expect(editButton().element.disabled).toBe(true);
			expect(editButton().attributes('title')).toBe('the params of this flower are not known yet');
			expect(wrapper.emitted('edit')).toBeUndefined();
		});

		test('can be used once the params are known', async () => {
			mountParams();
			await wrapper.setProps({ known: false });
			await icon().trigger('click');

			await wrapper.setProps({ known: true });
			await editButton().trigger('click');

			expect(wrapper.emitted('edit')).toHaveLength(1);
		});

		test('has a title that says what it does', async () => {
			mountParams();
			await icon().trigger('click');

			expect(editButton().attributes('title')).toBe('change the params and draw the flower with them');
		});
	});

	test('the p has a test id', () => {
		mountParams();

		expect(icon().attributes('data-testid')).toBe('params-toggle');
	});

	test.each(['radius', 'numLayers', 'P', 'bias'])('wants the four params: it says so when %s is missing', (missing) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const params = { ...PARAMS };
		delete params[missing];

		mountParams(params);

		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});
});
