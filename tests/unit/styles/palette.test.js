import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(import.meta.dirname, '../../../src');

const filesIn = (dir) => readdirSync(dir).flatMap((name) => {
	const path = join(dir, name);
	return statSync(path).isDirectory() ? filesIn(path) : [path];
});

describe('the palette', () => {
	const palette = readFileSync(join(SRC, 'styles/palette.css'), 'utf8');
	const defined = new Set([...palette.matchAll(/(--fe-[a-z-]+)\s*:/g)].map((match) => match[1]));

	test('has the colours of the application', () => {
		expect([...defined]).toEqual(expect.arrayContaining([
			'--fe-green', '--fe-lightgreen', '--fe-black', '--fe-surface', '--fe-danger',
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

	test('is loaded by the application', () => {
		expect(readFileSync(join(SRC, 'main.js'), 'utf8')).toContain("import './styles/palette.css';");
	});
});
