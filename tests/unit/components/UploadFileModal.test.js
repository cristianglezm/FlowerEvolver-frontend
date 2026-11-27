// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import mitt from 'mitt';
import UploadFileModal from '../../../src/components/UploadFileModal.vue';
import { useErrorStore } from '../../../src/stores/ErrorStore';

describe('UploadFileModal', () => {
	let emitter;
	let wrapper;
	let ErrorStore;
	const file = (name, type = 'application/json') => new File(['{}'], name, { type });
	const open = (extra = {}) => {
		const request = { title: 'Import Flowers', btnCancel: 'Cancel', btnUpload: 'Import Files', onUpload: vi.fn(), ...extra };
		emitter.emit('showImport', request);
		return request;
	};
	// jsdom lets a test say which files an input has
	const choose = async (...files) => {
		const input = wrapper.get('#uploadFiles');
		Object.defineProperty(input.element, 'files', { value: files, configurable: true });
		await input.trigger('change');
	};
	const dialog = () => wrapper.get('dialog').element;
	const buttons = () => wrapper.findAll('.actions button');
	const cancel = () => buttons()[0];
	const upload = () => buttons()[1];

	beforeEach(() => {
		createTestingPinia({ stubActions: false, createSpy: vi.fn });
		ErrorStore = useErrorStore();
		emitter = mitt();
		wrapper = mount(UploadFileModal, { props: { id: 'importModal', channel: emitter, on: 'showImport' }, attachTo: document.body });
	});

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
		document.body.innerHTML = '';
	});

	test('is a dialog with the id that it is given, closed until it is asked to import', () => {
		expect(dialog().id).toBe('importModal');
		expect(dialog().open).toBe(false);
	});

	test('keeps the id of the input that the specs of the browser look for', () => {
		expect(wrapper.get('input[type="file"]').attributes('id')).toBe('uploadFiles');
		expect(wrapper.get('input[type="file"]').attributes()).toMatchObject({ multiple: '', accept: 'application/json, .json' });
	});

	test('opens with the title and the words on the buttons that it is told', async () => {
		open();
		await wrapper.vm.$nextTick();

		expect(dialog().open).toBe(true);
		expect(wrapper.get('h2').text()).toBe('Import Flowers');
		expect(cancel().text()).toBe('Cancel');
		expect(upload().text()).toBe('Import Files');
		expect(cancel().classes()).toContain('safe-button');
		expect(upload().classes()).toContain('safe-button');
	});

	test('asks to select files, until some are selected', () => {
		expect(wrapper.get('.FileInput p').text()).toBe('select files to import (Flower, Generation, Session)');
	});

	test('says which files are selected', async () => {
		open();
		await choose(file('a.json'), file('b.json'));

		expect(wrapper.get('.FileInput p').text()).toBe('2 files selected (a.json, b.json)');
	});

	test('says it for one file as well', async () => {
		open();
		await choose(file('only.json'));

		expect(wrapper.get('.FileInput p').text()).toBe('1 files selected (only.json)');
	});

	test('hands the files to what it was asked for, with the dialog, and stays open until that closes it', async () => {
		const request = open();
		const a = file('a.json');
		await wrapper.vm.$nextTick();
		await choose(a);

		await upload().trigger('click');

		expect(request.onUpload).toHaveBeenCalledTimes(1);
		const [handedDialog, files] = request.onUpload.mock.calls[0];
		expect(files).toEqual([a]);
		expect(dialog().open).toBe(true);
		handedDialog.close();
		expect(dialog().open).toBe(false);
	});

	test('does not take a file that is not a json: it closes and says which one', async () => {
		const request = open();
		await wrapper.vm.$nextTick();
		await choose(file('a.json'), file('notes.txt', 'text/plain'));

		await upload().trigger('click');

		expect(request.onUpload).not.toHaveBeenCalled();
		expect(dialog().open).toBe(false);
		expect(ErrorStore.errors).toEqual(['notes.txt file was not valid, valid files are (.json)']);
	});

	test('Cancel closes it, and nothing is imported', async () => {
		const request = open();
		await wrapper.vm.$nextTick();

		await cancel().trigger('click');

		expect(dialog().open).toBe(false);
		expect(request.onUpload).not.toHaveBeenCalled();
	});

	test('the × closes it', async () => {
		open();
		await wrapper.vm.$nextTick();

		await wrapper.get('.fe-modal-close').trigger('click');

		expect(dialog().open).toBe(false);
	});

	test('listens while it is there, and does not when it is unmounted', () => {
		expect(emitter.all.get('showImport')).toHaveLength(1);

		wrapper.unmount();
		wrapper = undefined;

		expect(emitter.all.get('showImport') ?? []).toHaveLength(0);
	});

	test('leaves the listeners of others on its events when it is unmounted', () => {
		const others = ['showImport'].map((event) => {
			const other = vi.fn();
			emitter.on(event, other);
			return [event, other];
		});

		wrapper.unmount();
		wrapper = undefined;
		for(const [event, other] of others){
			emitter.emit(event, {});
			expect(other, event).toHaveBeenCalledTimes(1);
		}
	});
});
