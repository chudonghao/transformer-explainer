import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import * as transformers from '@xenova/transformers';
import { Tensor } from 'onnxruntime-web';
import * as stores from 'svelte/store';
import { tick } from 'svelte';
import * as tokenization from '../src/utils/tokenization.js';
import * as cachedOutputs from '../src/utils/cachedOutputs.js';

const { get, writable } = stores;
const root = new URL('../', import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));

// Execute the production TypeScript modules with browser animation and ONNX
// execution replaced. Tokenizers, example files, stores and runtime logic are real.
async function loadModule(path, dependencies) {
	const source = await readFile(new URL(path, root), 'utf8');
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
			esModuleInterop: true
		}
	});
	const exports = {};
	new Function('exports', 'require', outputText)(exports, (name) => {
		assert.ok(Object.hasOwn(dependencies, name), `Missing test dependency: ${name}`);
		return dependencies[name];
	});
	return exports;
}

async function waitFor(predicate) {
	const deadline = Date.now() + 5000;
	while (!predicate()) {
		assert.ok(Date.now() < deadline, 'Model runtime did not settle');
		await new Promise((resolve) => setImmediate(resolve));
	}
}

async function runtime(context, failedPaths = new Set()) {
	const state = Object.fromEntries(
		Object.entries({
			modelInput: { text: '' },
			isFetchingModel: true,
			isMobile: false,
			isModelRunning: false,
			modelData: undefined,
			modelDownloadProgress: { loaded: 0, total: 0 },
			modelError: null,
			modelReload: 0,
			modelSession: undefined,
			modelTokenizer: undefined,
			predictedToken: undefined,
			sampling: { type: 'top-k', value: 1 },
			selectedExampleIdx: 0,
			selectedModel: 'gpt2-zh',
			temperature: 0.8,
			tokens: [],
			tokenIds: [],
			userId: null
		}).map(([key, value]) => [key, writable(value)])
	);
	const dependencies = {
		'$app/paths': { base: '' },
		'@xenova/transformers': transformers,
		'svelte/store': stores,
		svelte: { tick },
		'~/store': state,
		'~/i18n': { locale: writable('zh-CN') },
		'~/constants/examples': {}, // These tests use the Chinese JSON examples.
		'./animation': { completeCurrentAnimation() {}, async showFlowAnimation() {} },
		'./tokenization.js': tokenization,
		'./cachedOutputs.js': cachedOutputs,
		'./models/gpt2-zh.json': await readJson('src/constants/models/gpt2-zh.json'),
		'./fetchChunks.js': {
			async fetchAndMergeChunks() {
				return { mergedArray: new ArrayBuffer(0), hasCache: false };
			}
		}
	};
	const { models, maxInputTokens } = await loadModule('src/constants/models.ts', dependencies);
	dependencies['~/constants/models'] = { models, maxInputTokens };
	dependencies['./array'] = await loadModule('src/utils/array.ts', dependencies);
	const model = models['gpt2-zh'];
	const feeds = [];
	const session = {
		outputNames: [],
		async release() {},
		async run({ input }) {
			feeds.push(Array.from(input.data, Number));
			const count = input.dims[1];
			const logits = new Float32Array(model.vocab_size).fill(-10);
			logits[8171] = 10; // Deterministically sample the WordPiece continuation ##n.
			return Object.fromEntries(
				this.outputNames.map((name) => [
					name,
					name === 'linear_output'
						? new Tensor('float32', logits, [model.vocab_size])
						: new Tensor('float32', new Float32Array(count * count), [1, count, count])
				])
			);
		}
	};
	dependencies['onnxruntime-web'] = {
		Tensor,
		env: { wasm: {} },
		InferenceSession: {
			async create() {
				return session;
			}
		}
	};
	const data = await loadModule('src/utils/data.ts', dependencies);
	dependencies['./data'] = data;
	session.outputNames = [...data.attentionTensorNames(model), 'linear_output'];
	const requests = [];
	context.mock.method(global, 'fetch', async (path) => {
		requests.push(path);
		if (failedPaths.has(path)) return new Response('Unavailable', { status: 503 });
		return new Response(await readFile(new URL(`static${path}`, root)));
	});
	context.mock.method(console, 'error', () => {});
	const previousWindow = Object.getOwnPropertyDescriptor(global, 'window');
	Object.defineProperty(global, 'window', { configurable: true, value: {} });
	const { createModelRuntime } = await loadModule('src/utils/modelRuntime.ts', dependencies);
	const dispose = createModelRuntime(() => {});
	context.after(() => {
		dispose();
		if (previousWindow) Object.defineProperty(global, 'window', previousWindow);
		else delete global.window;
	});
	await waitFor(() => !get(state.isFetchingModel));
	return { state, requests, feeds, model, session, maxInputTokens };
}

test('browsing examples after a model download failure keeps retry available', async (context) => {
	const manifest = '/models/gpt2-zh/manifest.json';
	const failedPaths = new Set([manifest]);
	const { state, requests, model, session } = await runtime(context, failedPaths);
	assert.equal(get(state.modelError), 'ui.modelLoadFailed');
	assert.equal(get(state.modelSession), undefined);
	assert.ok(get(state.modelTokenizer));

	state.selectedExampleIdx.set(1);
	state.modelInput.set({ text: model.prompts[1] });
	await waitFor(() => !get(state.isModelRunning));
	assert.equal(get(state.modelData).prompt, model.prompts[1]);
	assert.equal(get(state.modelError), 'ui.modelLoadFailed');
	assert.equal(requests.filter((path) => path === manifest).length, 1);

	// Even a failed example request must not replace the model's retry action.
	failedPaths.add('/examples/gpt2-zh/2.json');
	state.selectedExampleIdx.set(2);
	state.modelInput.set({ text: model.prompts[2] });
	await waitFor(() => !get(state.isModelRunning));
	assert.equal(get(state.modelError), 'ui.modelLoadFailed');

	failedPaths.clear();
	state.modelReload.update((count) => count + 1);
	assert.equal(get(state.modelError), null);
	await waitFor(() => !get(state.isFetchingModel));
	assert.equal(get(state.modelSession), session);
	assert.equal(get(state.modelError), null);
	assert.equal(requests.filter((path) => path === manifest).length, 2);
});

test('live generation passes sampled IDs through to ONNX and re-tokenizes edited text', async (context) => {
	const { state, feeds } = await runtime(context);
	assert.equal(get(state.modelError), null);
	const tokenizer = get(state.modelTokenizer);
	state.modelInput.set({ text: 'be' });
	await waitFor(() => !get(state.isModelRunning));
	assert.deepEqual(feeds.at(-1), [8815]);
	assert.equal(get(state.predictedToken).tokenId, 8171);

	const next = tokenization.prepareInput(tokenizer, get(state.modelInput), 8171, true);
	state.modelInput.set(next);
	await waitFor(() => !get(state.isModelRunning));
	assert.deepEqual(feeds.at(-1), [8815, 8171]);
	assert.deepEqual(get(state.tokenIds), [8815, 8171]);
	assert.deepEqual(get(state.tokens), ['be', '##n']);

	// Accepting a prediction by focusing must not re-encode it on submission.
	state.modelInput.set(tokenization.prepareInput(tokenizer, next, undefined, true));
	await waitFor(() => !get(state.isModelRunning));
	assert.equal(feeds.length, 3);
	assert.deepEqual(feeds.at(-1), [8815, 8171]);

	state.modelInput.set({ text: 'ben' });
	await waitFor(() => !get(state.isModelRunning));
	assert.deepEqual(feeds.at(-1), [10016]);
	assert.deepEqual(get(state.tokens), ['ben']);
});

test('the input limit checks the actual generated sequence before running ONNX', async (context) => {
	const { state, feeds, maxInputTokens } = await runtime(context);
	state.modelInput.set({
		text: 'be' + 'n'.repeat(maxInputTokens),
		tokenIds: [8815, ...Array(maxInputTokens).fill(8171)]
	});
	await waitFor(() => !get(state.isModelRunning));
	assert.equal(get(state.modelError), 'ui.inferenceFailed');
	assert.equal(feeds.length, 0);

	state.modelInput.set({ text: 'be' });
	await waitFor(() => !get(state.isModelRunning));
	assert.equal(get(state.modelError), null);
	assert.deepEqual(feeds.at(-1), [8815]);
});
