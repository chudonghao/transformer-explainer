import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

function serialize(value) {
	if (typeof value === 'number') {
		if (Object.is(value, -0)) return '-0';
		// Seventeen significant digits round-trip IEEE-754 values and avoid
		// ambiguous halfway decimal literals in generated JavaScript.
		return Number.isInteger(value) ? String(value) : value.toPrecision(17);
	}
	if (Array.isArray(value)) return `[${value.map(serialize).join(',')}]`;
	if (value && typeof value === 'object') {
		return `{${Object.entries(value)
			.map(([key, item]) => `${JSON.stringify(key)}:${serialize(item)}`)
			.join(',')}}`;
	}
	return JSON.stringify(value);
}

const index = Number(process.argv[2]);
assert.ok(Number.isInteger(index) && index >= 0);
const example = JSON.parse(readFileSync(0, 'utf8'));
const directory = new URL('../../constants/examples/', import.meta.url);
mkdirSync(directory, { recursive: true });
writeFileSync(
	new URL(`ex${index}.js`, directory),
	`export const ex${index} = ${serialize(example)};\n`
);
