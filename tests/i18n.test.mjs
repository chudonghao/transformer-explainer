import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'svelte/compiler';
import { get } from 'svelte/store';
import {
	changeLocale,
	DEFAULT_LOCALE,
	initializeLocale,
	interpolate,
	locale,
	resolveLocale,
	STORAGE_KEY,
	supportedLocales
} from '../src/i18n/locale.js';

const dictionaries = Object.fromEntries(
	await Promise.all(
		supportedLocales.map(async ({ code }) => [
			code,
			JSON.parse(await readFile(new URL(`../src/i18n/messages/${code}.json`, import.meta.url)))
		])
	)
);
const en = dictionaries.en;

function mockBrowser(context, { saved = null, languages = ['en-US'] } = {}) {
	const values = new Map(saved === null ? [] : [[STORAGE_KEY, saved]]);
	const storage = {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => {
			values.set(key, value);
		}
	};
	for (const [name, value] of Object.entries({ localStorage: storage, navigator: { languages } })) {
		const original = Object.getOwnPropertyDescriptor(global, name);
		Object.defineProperty(global, name, { configurable: true, value });
		context.after(() => {
			if (original) Object.defineProperty(global, name, original);
			else delete global[name];
		});
	}
	locale.set(DEFAULT_LOCALE);
	context.after(() => locale.set(DEFAULT_LOCALE));
	return storage;
}

test('locale starts with the default language before browser initialization', () => {
	assert.equal(get(locale), DEFAULT_LOCALE);
});

test('initialization reads the saved preference into the locale store', (context) => {
	mockBrowser(context, { saved: 'zh-CN', languages: ['en-US'] });
	initializeLocale();
	assert.equal(get(locale), 'zh-CN');
});

test('changing language persists the choice for the next initialization', (context) => {
	const storage = mockBrowser(context);
	changeLocale('zh-CN');
	assert.equal(get(locale), 'zh-CN');
	assert.equal(storage.getItem(STORAGE_KEY), 'zh-CN');

	locale.set(DEFAULT_LOCALE);
	initializeLocale();
	assert.equal(get(locale), 'zh-CN');
});

test('an unsupported language does not change the current or saved preference', (context) => {
	const storage = mockBrowser(context, { saved: 'zh-CN' });
	initializeLocale();
	const write = context.mock.method(storage, 'setItem');
	changeLocale('unsupported');
	assert.equal(get(locale), 'zh-CN');
	assert.equal(storage.getItem(STORAGE_KEY), 'zh-CN');
	assert.equal(write.mock.callCount(), 0);
});

test('initialization uses the browser language when reading storage fails', (context) => {
	const storage = mockBrowser(context, { languages: ['zh-CN'] });
	context.mock.method(storage, 'getItem', () => {
		throw new Error('Storage read denied');
	});
	assert.doesNotThrow(() => initializeLocale());
	assert.equal(get(locale), 'zh-CN');
});

test('language switching still updates the store when saving fails', (context) => {
	const storage = mockBrowser(context);
	context.mock.method(storage, 'setItem', () => {
		throw new Error('Storage write denied');
	});
	assert.doesNotThrow(() => changeLocale('zh-CN'));
	assert.equal(get(locale), 'zh-CN');
});

test('a blocked localStorage getter does not prevent initialization or switching', (context) => {
	mockBrowser(context, { languages: ['zh-CN'] });
	Object.defineProperty(global, 'localStorage', {
		configurable: true,
		get() {
			throw new Error('Storage access denied');
		}
	});
	assert.doesNotThrow(() => initializeLocale());
	assert.equal(get(locale), 'zh-CN');
	assert.doesNotThrow(() => changeLocale('en'));
	assert.equal(get(locale), 'en');
});

test('an explicit language choice takes priority over the browser', () => {
	assert.equal(resolveLocale('en', ['zh-CN']), 'en');
	assert.equal(resolveLocale('zh-CN', ['en-US']), 'zh-CN');
});

test('browser language matching handles regional variants and unsupported preferences', () => {
	assert.equal(resolveLocale(null, ['fr-FR', 'zh-TW']), 'zh-CN');
	assert.equal(resolveLocale(null, ['en-GB', 'zh-CN']), 'en');
	assert.equal(resolveLocale('invalid', ['ZH-hans']), 'zh-CN');
	assert.equal(resolveLocale(null, ['fr-FR']), 'en');
	assert.equal(resolveLocale(null), 'en');
});

test('named parameters preserve numbers, literal text, and unknown placeholders', () => {
	assert.equal(interpolate('{count} / {total}', { count: 0, total: 12 }), '0 / 12');
	assert.equal(interpolate('{token}', { token: '<script>$&</script>' }), '<script>$&</script>');
	assert.equal(interpolate('{missing}'), '{missing}');
});

test('every registered language covers all messages and named parameters', () => {
	assert.equal(new Set(supportedLocales.map(({ code }) => code)).size, supportedLocales.length);
	const parameters = (value) => [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
	for (const [code, dictionary] of Object.entries(dictionaries)) {
		assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(en).sort(), code);
		for (const [key, value] of Object.entries(en)) {
			assert.ok(typeof dictionary[key] === 'string' && dictionary[key].trim(), `${code}: ${key}`);
			assert.deepEqual(parameters(dictionary[key]), parameters(value), `${code}: ${key}`);
		}
	}
});

test('translated articles preserve references and example token/code values', () => {
	const links = (value) => [...value.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).sort();
	const code = (value) =>
		[...value.matchAll(/<code\b[^>]*>(.*?)<\/code\s*>/g)].map((m) => m[1]).sort();
	for (const [localeCode, dictionary] of Object.entries(dictionaries)) {
		for (const [key, value] of Object.entries(en).filter(([key]) => key.startsWith('article.'))) {
			assert.deepEqual(
				links(dictionary[key]),
				links(value),
				`References differ: ${localeCode}: ${key}`
			);
			assert.deepEqual(
				code(dictionary[key]),
				code(value),
				`Example values differ: ${localeCode}: ${key}`
			);
		}
	}
});

test('all lesson titles and bodies are available in every registered language', async () => {
	const source = await readFile(new URL('../src/utils/textbookPages.ts', import.meta.url), 'utf8');
	const keys = [...source.matchAll(/(?:title|content):\s*['"](tutorial\.[^'"]+)['"]/g)].map(
		(m) => m[1]
	);
	assert.equal(keys.length, 40);
	for (const [code, dictionary] of Object.entries(dictionaries)) {
		for (const key of keys) {
			assert.ok(dictionary[key], `Missing lesson: ${code}: ${key}`);
		}
	}
});

function validateRichText(value) {
	const ast = parse(value);
	assert.ok(!ast.instance && !ast.module && !ast.css, 'Only static HTML is allowed');
	const tags = new Set(['p', 'strong', 'blockquote', 'div', 'span', 'ul', 'li', 'a', 'em', 'code']);
	const attributes = new Set(['class', 'href', 'title', 'target']);
	function visit(node) {
		if (node.type === 'Text') return;
		assert.equal(node.type, 'Element', 'Dynamic content is not allowed');
		assert.ok(tags.has(node.name), `Unexpected element: ${node.name}`);
		for (const attribute of node.attributes) {
			assert.equal(attribute.type, 'Attribute');
			assert.ok(attributes.has(attribute.name), `Unexpected attribute: ${attribute.name}`);
			assert.ok(Array.isArray(attribute.value));
			assert.ok(attribute.value.every((part) => part.type === 'Text'));
			const text = attribute.value.map((part) => part.data).join('');
			if (attribute.name === 'href') assert.equal(new URL(text).protocol, 'https:');
			if (attribute.name === 'target') assert.equal(text, '_blank');
		}
		node.children.forEach(visit);
	}
	ast.html.children.forEach(visit);
}

test('rich text translations use valid static markup and HTTPS links only', () => {
	for (const dictionary of Object.values(dictionaries)) {
		for (const [key, value] of Object.entries(dictionary)) {
			if (key.startsWith('article.') || /^tutorial\..+\.content$/.test(key)) {
				assert.doesNotThrow(() => validateRichText(value), key);
			}
		}
	}
});

test('rich text validation rejects executable markup, unsafe links, and dynamic content', () => {
	for (const value of [
		'<script>alert(1)</script>',
		'<img src="https://example.com/image.png">',
		'<a href="javascript:alert(1)">link</a>',
		'<a href="jav&#x61;script:alert(1)">link</a>',
		'<span onclick="alert(1)">text</span>',
		'<span style="background: url(https://example.com)">text</span>',
		'<span>{input}</span>',
		'{@html input}'
	]) {
		assert.throws(() => validateRichText(value), value);
	}
});
