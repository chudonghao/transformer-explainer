import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { BertTokenizer, GPT2Tokenizer } from '@xenova/transformers';
import { fetchAndMergeChunks } from '../src/utils/fetchChunks.js';
import { restoreMaskedScores } from '../src/utils/cachedOutputs.js';
import { appendToken, encodeInput, tokenLabels } from '../src/utils/tokenization.js';
import { ex0 } from '../src/constants/examples/ex0.js';

function mockGlobal(context, name, value) {
	const original = Object.getOwnPropertyDescriptor(global, name);
	Object.defineProperty(global, name, { configurable: true, writable: true, value });
	context.after(() => {
		if (original) Object.defineProperty(global, name, original);
		else delete global[name];
	});
}

test('model chunks merge in manifest order despite out-of-order responses', async (context) => {
	mockGlobal(context, 'caches', undefined);
	const pending = new Map();
	mockGlobal(context, 'fetch', (url) => new Promise((resolve) => pending.set(url, resolve)));
	const progress = [];
	const download = fetchAndMergeChunks(['/a', '/b', '/c'], {
		onProgress: (loaded, total) => progress.push([loaded, total])
	});
	await new Promise((resolve) => setImmediate(resolve));
	pending.get('/c')(new Response(new Uint8Array([3])));
	pending.get('/a')(new Response(new Uint8Array([1])));
	pending.get('/b')(new Response(new Uint8Array([2])));
	const result = await download;
	assert.deepEqual([...new Uint8Array(result.mergedArray)], [1, 2, 3]);
	assert.equal(result.hasCache, false);
	assert.deepEqual(progress, [
		[1, 3],
		[2, 3],
		[3, 3]
	]);
});

test('cached chunks are reused and a storage quota error does not break inference', async (context) => {
	mockGlobal(context, 'caches', {
		open: async () => ({
			match: async (url) => (url === '/cached' ? new Response(new Uint8Array([7])) : undefined),
			put: async () => {
				throw new Error('Quota exceeded');
			}
		})
	});
	const fetched = [];
	mockGlobal(context, 'fetch', async (url) => {
		fetched.push(url);
		return new Response(new Uint8Array([8]));
	});
	const result = await fetchAndMergeChunks(['/cached', '/network']);
	assert.equal(result.hasCache, true);
	assert.deepEqual(fetched, ['/network']);
	assert.deepEqual([...new Uint8Array(result.mergedArray)], [7, 8]);
});

test('blocked cache access falls back to downloading', async (context) => {
	mockGlobal(context, 'caches', {
		open: async () => {
			throw new Error('Storage denied');
		}
	});
	mockGlobal(context, 'fetch', async () => new Response(new Uint8Array([9])));
	const result = await fetchAndMergeChunks(['/model']);
	assert.deepEqual([...new Uint8Array(result.mergedArray)], [9]);
});

test('failed chunks reject the model and cancel other in-flight requests', async (context) => {
	mockGlobal(context, 'caches', undefined);
	let cancelled = false;
	mockGlobal(context, 'fetch', async (url, { signal }) => {
		if (url === '/missing') return new Response('Not found', { status: 404 });
		return new Promise((resolve, reject) =>
			signal.addEventListener('abort', () => {
				cancelled = true;
				reject(new DOMException('Aborted', 'AbortError'));
			})
		);
	});
	await assert.rejects(fetchAndMergeChunks(['/missing', '/slow']), /404/);
	assert.equal(cancelled, true);
});

test('switching models can cancel a download before any request', async (context) => {
	mockGlobal(context, 'caches', undefined);
	mockGlobal(context, 'fetch', () => assert.fail('Aborted requests must not reach the network'));
	const controller = new AbortController();
	controller.abort();
	await assert.rejects(fetchAndMergeChunks(['/model'], { signal: controller.signal }), {
		name: 'AbortError'
	});
});

test('cached masks recover negative infinity without changing zero scores', () => {
	const raw = {
		attention: {
			data: [
				[0, null],
				[-1.5, 2]
			]
		}
	};
	assert.deepEqual(restoreMaskedScores(raw).attention.data, [
		[0, -Infinity],
		[-1.5, 2]
	]);
	assert.equal(raw.attention.data[0][1], null);
});

async function tokenizer(id, Constructor) {
	const root = new URL(`../static/tokenizers/${id}/`, import.meta.url);
	const definition = JSON.parse(await readFile(new URL('tokenizer.json', root)));
	const config = JSON.parse(await readFile(new URL('tokenizer_config.json', root)));
	return new Constructor(definition, config);
}

test('English tokenizer retains example boundaries and appends raw newlines', async () => {
	const english = await tokenizer('gpt2', GPT2Tokenizer);
	assert.deepEqual(encodeInput(english, ex0.prompt), ex0.tokenIds);
	assert.equal(appendToken(english, 'Hello', 198, false), 'Hello\n');
});

test('Chinese browser tokenization matches exported inputs without adding CLS or SEP', async () => {
	const chinese = await tokenizer('gpt2-zh', BertTokenizer);
	const manifest = JSON.parse(
		await readFile(new URL('../static/models/gpt2-zh/manifest.json', import.meta.url))
	);
	for (const entry of manifest.validation.cases) {
		assert.deepEqual(encodeInput(chinese, entry.prompt), entry.tokenIds, entry.prompt);
	}
	assert.deepEqual(tokenLabels(chinese, encodeInput(chinese, '今天天气'), true), [
		'今',
		'天',
		'天',
		'气'
	]);
	assert.equal(encodeInput(chinese, '中'.repeat(33)).length, 33);
	const id = (text) => chinese.model.tokens_to_ids.get(text);
	assert.equal(appendToken(chinese, '今天', id('好'), true), '今天好');
	assert.equal(appendToken(chinese, 'hello', id('world'), true), 'hello world');
	assert.equal(appendToken(chinese, 'hello', id('##s'), true), 'hellos');
});

test('published Chinese chunks match their recorded sizes and SHA-256 hashes', async () => {
	const root = new URL('../static/models/gpt2-zh/', import.meta.url);
	const manifest = JSON.parse(await readFile(new URL('manifest.json', root)));
	let total = 0;
	for (const chunk of manifest.chunks) {
		const data = await readFile(new URL(chunk.file, root));
		assert.equal(data.length, chunk.bytes);
		assert.ok(data.length <= 10 * 1024 * 1024);
		assert.equal(createHash('sha256').update(data).digest('hex'), chunk.sha256);
		total += data.length;
	}
	assert.equal(total, manifest.bytes);
	assert.ok(manifest.validation.referenceMaxError < 0.002);
});
