import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// `join` gives the separator of the system, and the patterns that say which files to leave out are written with `/`
const portable = (path) => path.replaceAll('\\', '/');
const SRC = portable(join(import.meta.dirname, '../../../src'));

const filesIn = (dir) => readdirSync(dir).flatMap((name) => {
	const path = portable(join(dir, name));
	return statSync(path).isDirectory() ? filesIn(path) : [path];
});

// the files that keep their own colours: the chat widget, and what is given to a library or to a backdrop as a literal
const WIDGET = 'ChatBot|KokoroModel|LLMRemote|TTSRemote|AudioPlayer|CacheManager';
const KEEPS_ONE_OFFS = new RegExp(`${WIDGET}|palette\\.css|views/Charts\\.vue`);
const KEEPS_PLAIN = new RegExp(`${WIDGET}|ui/ModalDialog\\.vue`);

describe('the palette', () => {
	const palette = readFileSync(join(SRC, 'styles/palette.css'), 'utf8');
	const defined = new Set([...palette.matchAll(/(--fe-[a-z-]+)\s*:/g)].map((match) => match[1]));

	test('has the colours of the application', () => {
		expect([...defined]).toEqual(expect.arrayContaining([
			'--fe-green', '--fe-lightgreen', '--fe-black', '--fe-surface', '--fe-danger',
			'--fe-progress-track', '--fe-shadow-card', '--fe-shadow-selected', '--fe-shadow-fixed', '--fe-shadow-switch',
			'--fe-scrollbar-track', '--fe-spinner-track', '--fe-menu-bar', '--fe-menu-overlay',
			'--fe-chart-bg', '--fe-chart-border', '--fe-chart-grid', '--fe-atypical',
		]));
		expect(palette).toMatch(/--fe-surface:\s*rgb\(37, 39, 41\)/);
	});

	test('every colour that a component asks for is in it, a name that is not there is a colour that is not there', () => {
		// the variables that a component takes from the place where it is (sizes of a field, margin of a button), not colours
		const layout = /^--fe-(field|range|button)-/;
		const used = [];
		for(const file of filesIn(SRC).filter((path) => /\.(vue|css)$/.test(path))){
			for(const match of readFileSync(file, 'utf8').matchAll(/var\((--fe-[a-z-]+)/g)){
				if(!layout.test(match[1])){
					used.push({ file: file.replace(SRC, 'src'), name: match[1] });
				}
			}
		}

		expect(used.length).toBeGreaterThan(0);
		expect(used.filter(({ name }) => !defined.has(name))).toEqual([]);
	});

	test('has the colour that each name stands for, the ones that were written out in the components', () => {
		const valueOf = (name) => palette.match(new RegExp(name + ':\\s*([^;]+);'))[1].trim();

		expect(valueOf('--fe-progress-track')).toBe('rgba(4, 97, 43, 0.986)');
		expect(valueOf('--fe-shadow-card')).toBe('rgba(12, 13, 12, 0.5)');
		expect(valueOf('--fe-shadow-selected')).toBe('rgba(0, 128, 0, 0.5)');
		expect(valueOf('--fe-shadow-fixed')).toBe('rgba(47, 50, 52, 0.8)');
		expect(valueOf('--fe-shadow-switch')).toBe('rgb(47, 38, 37)');
		expect(valueOf('--fe-scrollbar-track')).toBe('rgb(47, 50, 52)');
		expect(valueOf('--fe-spinner-track')).toBe('#444');
		expect(valueOf('--fe-menu-bar')).toBe('rgb(1, 88, 1)');
		expect(valueOf('--fe-menu-overlay')).toBe('rgb(0, 128, 0, 0.8)');
		expect(valueOf('--fe-chart-bg')).toBe('#0b0b0b');
		expect(valueOf('--fe-chart-border')).toBe('#234');
		expect(valueOf('--fe-chart-grid')).toBe('#456');
		expect(valueOf('--fe-atypical')).toBe('#ffb347');
	});

	test('is the only place where those colours are written out: a component asks for them by name', () => {
		// what the chat widget has stays with it, and what the chart library draws takes colours, not names
		const written = ['rgb(37, 39, 41)', 'rgba(4, 97, 43, 0.986)', 'rgba(12, 13, 12, 0.5)', 'rgba(0, 128, 0, 0.5)', 'rgba(47, 50, 52, 0.8)',
			'rgb(47, 50, 52)', 'rgb(47, 38, 37)', 'rgb(0, 128, 0, 0.8)', 'rgb(1, 88, 1)', '#90ee90', '#ffb347', '#0b0b0b', '#234', '#456', '#444'];
		const found = [];
		for(const file of filesIn(SRC).filter((path) => /\.(vue|css|js)$/.test(path) && !KEEPS_ONE_OFFS.test(path))){
			const text = readFileSync(file, 'utf8');
			for(const colour of written.filter((candidate) => text.includes(candidate))){
				found.push(file.replace(SRC, 'src') + ' ' + colour);
			}
		}

		expect(found).toEqual([]);
	});

	test('is asked for the plain colours as well: a declaration says var(--fe-green), not green', () => {
		// the chat widget keeps its own, and the backdrop of the dialog is a literal on purpose (see ModalDialog)
		const word = /(?<![\w-])(lightgreen|green|black|red|whitesmoke|white)(?![\w-])/;
		const found = [];
		for(const file of filesIn(SRC).filter((path) => /\.vue$/.test(path) && !KEEPS_PLAIN.test(path))){
			const text = readFileSync(file, 'utf8');
			const blocks = [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]);
			const attributes = [...text.matchAll(/\sstyle="([^"]*)"/g)].map((match) => match[1].replaceAll(';', ';\n'));
			for(const line of [...blocks, ...attributes].flatMap((css) => css.split('\n'))){
				const declaration = line.match(/^\s*[a-z-]+\s*:(.*)$/);
				if(declaration && !/[{}]/.test(line) && word.test(declaration[1])){
					found.push(file.replace(SRC, 'src') + ' ' + line.trim());
				}
			}
		}

		expect(found).toEqual([]);
	});

	test('knows the files that keep their colours by the paths of any system: a path of Windows is the same file', () => {
		expect(portable('C:\\work\\src\\views\\Charts.vue')).toBe('C:/work/src/views/Charts.vue');
		expect(KEEPS_ONE_OFFS.test(portable('C:\\work\\src\\views\\Charts.vue'))).toBe(true);
		expect(KEEPS_PLAIN.test(portable('C:\\work\\src\\components\\ui\\ModalDialog.vue'))).toBe(true);
		expect(KEEPS_ONE_OFFS.test(portable('C:\\work\\src\\views\\Species.vue'))).toBe(false);
		expect(KEEPS_PLAIN.test(portable('C:\\work\\src\\components\\ui\\SafeButton.vue'))).toBe(false);
	});

	test('is loaded by the application', () => {
		expect(readFileSync(join(SRC, 'main.js'), 'utf8')).toContain("import './styles/palette.css';");
	});
});
