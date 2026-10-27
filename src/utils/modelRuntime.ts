import { base } from '$app/paths';
import { BertTokenizer, GPT2Tokenizer, type PreTrainedTokenizer } from '@xenova/transformers';
import * as ort from 'onnxruntime-web';
import { get } from 'svelte/store';
import { locale } from '~/i18n';
import { models, type ModelId } from '~/constants/models';
import { ex0, ex1, ex2, ex3, ex4 } from '~/constants/examples';
import {
	inputText,
	isFetchingModel,
	isMobile,
	isModelRunning,
	modelData,
	modelDownloadProgress,
	modelError,
	modelReload,
	modelSession,
	modelTokenizer,
	predictedToken,
	sampling,
	selectedExampleIdx,
	selectedModel,
	temperature,
	userId
} from '~/store';
import { adjustTemperature, attentionTensorNames, fakeRunWithCachedData, runModel } from './data';
import { completeCurrentAnimation } from './animation';
import { fetchAndMergeChunks } from './fetchChunks.js';
import { restoreMaskedScores } from './cachedOutputs.js';

const englishExamples = [ex0, ex1, ex2, ex3, ex4];

export function createModelRuntime(setActive: (active: boolean) => void) {
	let disposed = false;
	let generation = 0;
	let runNumber = 0;
	let switching = true;
	let abort = new AbortController();
	let tokenizer: PreTrainedTokenizer | undefined;
	let session: ort.InferenceSession | undefined;
	let pendingLoad = Promise.resolve();
	let pendingRun = Promise.resolve();
	const examples = new Map<string, CachedModelData>();
	const getParameters = () => ({ temperature: get(temperature), sampling: get(sampling) });

	async function readJson(path: string, signal: AbortSignal) {
		const response = await fetch(`${base}/${path}`, { signal });
		if (!response.ok) throw new Error(`Unable to load ${path}: ${response.status}`);
		return response.json();
	}

	async function readExample(
		id: ModelId,
		index: number,
		signal: AbortSignal
	): Promise<CachedModelData> {
		const key = `${id}:${index}`;
		if (!examples.has(key)) {
			const data =
				id === 'gpt2'
					? englishExamples[index]
					: await readJson(`examples/${id}/${index}.json`, signal);
			if (
				data.prompt !== models[id].prompts[index] ||
				data.logits.length !== models[id].vocab_size
			) {
				throw new Error('Example data does not match the selected model.');
			}
			examples.set(key, { ...data, outputs: restoreMaskedScores(data.outputs) });
		}
		return examples.get(key)!;
	}

	function runInput() {
		if (switching || !tokenizer || disposed) return;
		const currentGeneration = generation;
		const request = ++runNumber;
		const isCurrent = () => !disposed && generation === currentGeneration && request === runNumber;
		const id = get(selectedModel);
		const currentTokenizer = tokenizer;
		const currentSession = session;
		const input = get(inputText).trim();
		const index = get(selectedExampleIdx);
		isModelRunning.set(true);
		modelError.set(null);
		completeCurrentAnimation();
		pendingRun = pendingRun
			.then(async () => {
				if (!isCurrent()) return;
				const parameters = {
					tokenizer: currentTokenizer,
					getParameters,
					isCurrent
				};
				if (currentSession) {
					await runModel({ ...parameters, session: currentSession, model: models[id], input });
				} else {
					const cachedData = await readExample(id, index, abort.signal);
					await fakeRunWithCachedData({ ...parameters, cachedData });
				}
			})
			.catch((error) => {
				if (isCurrent()) {
					console.error('Model inference failed:', error);
					modelError.set('ui.inferenceFailed');
				}
			})
			.finally(() => {
				if (isCurrent()) isModelRunning.set(false);
			});
	}

	function requestLoad() {
		const currentGeneration = ++generation;
		++runNumber;
		abort.abort();
		abort = new AbortController();
		const signal = abort.signal;
		const isCurrent = () => !disposed && generation === currentGeneration;
		const id = get(selectedModel);
		switching = true;
		setActive(false);
		inputText.set(models[id].prompts[0]);
		tokenizer = undefined;
		modelTokenizer.set(undefined);
		modelSession.set(undefined);
		predictedToken.set(undefined);
		isFetchingModel.set(true);
		modelError.set(null);
		modelDownloadProgress.set({ loaded: 0, total: 0 });
		completeCurrentAnimation();
		pendingLoad = pendingLoad
			.then(async () => {
				await pendingRun;
				if (!isCurrent()) return;
				isModelRunning.set(false);
				if (session) {
					await session.release();
					session = undefined;
				}
				const [definition, configuration, cachedData] = await Promise.all([
					readJson(`tokenizers/${id}/tokenizer.json`, signal),
					readJson(`tokenizers/${id}/tokenizer_config.json`, signal),
					readExample(id, 0, signal)
				]);
				if (!isCurrent()) return;
				const Tokenizer = models[id].wordPiece ? BertTokenizer : GPT2Tokenizer;
				tokenizer = new Tokenizer(definition, configuration);
				modelTokenizer.set(tokenizer);
				selectedExampleIdx.set(0);
				inputText.set(models[id].prompts[0]);
				setActive(true);
				await fakeRunWithCachedData({
					cachedData,
					tokenizer,
					getParameters,
					isCurrent
				});
				if (!isCurrent()) return;
				switching = false;
				if (get(isMobile)) {
					isFetchingModel.set(false);
					return;
				}
				const started = performance.now();
				const model = models[id];
				let chunks = model.chunks;
				if (model.manifest) {
					const manifest = await readJson(model.manifest, signal);
					chunks = manifest.chunks.map(
						({ file, sha256 }: { file: string; sha256: string }) =>
							`models/${id}/${file}?v=${sha256}`
					);
				}
				if (!isCurrent()) return;
				modelDownloadProgress.set({ loaded: 0, total: chunks.length });
				const { mergedArray, hasCache } = await fetchAndMergeChunks(
					chunks.map((path) => `${base}/${path}`),
					{
						signal,
						onProgress: (loaded, total) => {
							if (isCurrent()) modelDownloadProgress.set({ loaded, total });
						}
					}
				);
				if (!isCurrent()) return;
				const loadedSession = await ort.InferenceSession.create(mergedArray, {
					executionProviders: ['wasm']
				});
				if (!isCurrent()) {
					await loadedSession.release();
					return;
				}
				const expected = [...attentionTensorNames(model), 'linear_output'];
				if (!expected.every((name) => loadedSession.outputNames.includes(name))) {
					await loadedSession.release();
					throw new Error('This model does not expose the required visualization outputs.');
				}
				session = loadedSession;
				modelSession.set(session);
				isFetchingModel.set(false);
				window.dataLayer?.push({
					event: 'model-loaded',
					model: id,
					use_cache: hasCache,
					load_time_ms: performance.now() - started,
					user_id: get(userId)
				});
			})
			.catch((error) => {
				if (isCurrent()) {
					console.error('Model loading failed:', error);
					switching = false;
					isFetchingModel.set(false);
					isModelRunning.set(false);
					modelError.set('ui.modelLoadFailed');
				}
			});
	}

	function updateSampling() {
		if (switching || !tokenizer || disposed) return;
		adjustTemperature({
			tokenizer,
			logits: get(modelData).logits,
			temperature: get(temperature),
			sampling: get(sampling)
		});
	}

	ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/';
	ort.env.logLevel = 'error';
	selectedModel.set(get(locale) === 'zh-CN' ? 'gpt2-zh' : 'gpt2');
	const unsubscribe = [
		inputText.subscribe(runInput),
		temperature.subscribe(updateSampling),
		sampling.subscribe(updateSampling),
		selectedModel.subscribe(requestLoad)
	];
	let initialReload = true;
	unsubscribe.push(
		modelReload.subscribe(() => {
			if (initialReload) initialReload = false;
			else requestLoad();
		})
	);

	return () => {
		disposed = true;
		++generation;
		++runNumber;
		abort.abort();
		unsubscribe.forEach((stop) => stop());
		completeCurrentAnimation();
		void Promise.all([pendingLoad, pendingRun])
			.then(async () => {
				await session?.release();
			})
			.catch((error) => console.error('Model cleanup failed:', error));
	};
}
