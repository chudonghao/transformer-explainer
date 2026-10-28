import type { PreTrainedTokenizer } from '@xenova/transformers';
import * as ort from 'onnxruntime-web';
import { modelData, tokens, tokenIds, isModelRunning, predictedToken } from '~/store';
import { get } from 'svelte/store';
import { tick } from 'svelte';
import { maxInputTokens } from '~/constants/models';
import { reshapeArray } from './array';
import { showFlowAnimation } from './animation';
import { encodeInput, tokenLabels } from './tokenization.js';

export const fakeRunWithCachedData = async ({
	cachedData,
	tokenizer,
	getParameters,
	isCurrent = () => true
}: {
	cachedData: CachedModelData;
	tokenizer: PreTrainedTokenizer;
	getParameters: () => { temperature: number; sampling: Sampling };
	isCurrent?: () => boolean;
}) => {
	if (!isCurrent()) return;
	isModelRunning.set(true);
	try {
		const prediction = getProbabilities({
			tokenizer,
			logits: cachedData.logits,
			...getParameters()
		});
		modelData.set({ ...cachedData, ...prediction });
		tokens.set(cachedData.tokens);
		tokenIds.set(cachedData.tokenIds);
		predictedToken.set(undefined);
		await tick();
		if (!isCurrent()) return;
		await showFlowAnimation(cachedData.tokens.length, false);
		if (isCurrent()) predictedToken.set(get(modelData).sampled);
	} finally {
		if (isCurrent()) isModelRunning.set(false);
	}
};

export const runModel = async ({
	tokenizer,
	session,
	model,
	input,
	getParameters,
	isCurrent = () => true
}: {
	tokenizer: PreTrainedTokenizer;
	session: ort.InferenceSession;
	model: ModelMetaData & { wordPiece: boolean };
	input: ModelInput;
	getParameters: () => { temperature: number; sampling: Sampling };
	isCurrent?: () => boolean;
}) => {
	if (!isCurrent()) return;
	isModelRunning.set(true);
	try {
		const { token_ids, input_tokens } = getTokenization(tokenizer, input, model.wordPiece);
		if (token_ids.length === 0 || token_ids.length > maxInputTokens) {
			throw new Error(`Input must contain between 1 and ${maxInputTokens} tokens.`);
		}
		const previousIds = get(tokenIds);
		const isOneTokenAdded =
			previousIds.length === token_ids.length - 1 &&
			previousIds.every((id, index) => id === token_ids[index]);
		const { logits, outputs } = await getData(token_ids, session, model);
		if (!isCurrent()) return;
		const prediction = getProbabilities({ tokenizer, logits, ...getParameters() });
		tokens.set(input_tokens);
		tokenIds.set(token_ids);
		modelData.set({ logits, outputs, ...prediction });
		predictedToken.set(undefined);
		await tick();
		if (!isCurrent()) return;
		await showFlowAnimation(input_tokens.length, isOneTokenAdded);
		if (isCurrent()) predictedToken.set(get(modelData).sampled);
	} finally {
		if (isCurrent()) isModelRunning.set(false);
	}
};

export const adjustTemperature = ({
	tokenizer,
	logits,
	temperature,
	sampling
}: {
	tokenizer: PreTrainedTokenizer;
	logits: number[];
	temperature: number;
	sampling: Sampling;
}) => {
	const prediction = getProbabilities({ tokenizer, logits, sampling, temperature });
	modelData.update((data) => ({ ...data, ...prediction }));
	if (!get(isModelRunning)) predictedToken.set(prediction.sampled);
};

export const getTokenization = (
	tokenizer: PreTrainedTokenizer,
	input: ModelInput,
	wordPiece = false
) => {
	const token_ids = input.tokenIds ?? encodeInput(tokenizer, input.text);
	return { token_ids, input_tokens: tokenLabels(tokenizer, token_ids, wordPiece) };
};

export const getData = async (
	ids: number[],
	session: ort.InferenceSession,
	model: ModelMetaData
): Promise<Pick<ModelData, 'logits' | 'outputs'>> => {
	const inputTensor = new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]);
	let results: Record<string, ort.Tensor> = {};
	try {
		results = await session.run({ input: inputTensor });
		const logits = Array.from(results.linear_output.data as Float32Array);
		if (logits.length !== model.vocab_size)
			throw new Error('Model vocabulary size does not match.');
		const outputs: ModelData['outputs'] = {};
		for (const name of attentionTensorNames(model)) {
			const tensor = results[name];
			if (
				!tensor ||
				tensor.dims.length !== 3 ||
				tensor.dims[0] !== 1 ||
				tensor.dims[1] !== ids.length ||
				tensor.dims[2] !== ids.length
			) {
				throw new Error(`Missing or invalid attention output: ${name}`);
			}
			outputs[name] = { data: reshapeArray(Array.from(tensor.data as Float32Array), tensor.dims) };
		}
		return { logits, outputs };
	} finally {
		inputTensor.dispose();
		for (const tensor of Object.values(results)) tensor.dispose();
	}
};

export function attentionTensorNames(model: ModelMetaData) {
	return Array.from({ length: model.layer_num }, (_, layer) =>
		Array.from({ length: model.attention_head_num }, (_, head) =>
			['attn', 'attn_scaled', 'attn_masked', 'attn_softmax', 'attn_dropout'].map(
				(stage) => `block_${layer}_attn_head_${head}_${stage}`
			)
		).flat()
	).flat();
}

export const getProbabilities = ({
	tokenizer,
	logits,
	sampling = { type: 'top-k', value: 10 },
	temperature = 1
}: {
	tokenizer: PreTrainedTokenizer;
	logits: number[];
	sampling: Sampling;
	temperature: number;
}): { probabilities: Probabilities; sampled: Probability } => {
	if (sampling.type === 'top-p') {
		return topPSampling(tokenizer, logits, sampling.value, temperature);
	} else {
		return topKSampling(tokenizer, logits, sampling.value, temperature);
	}
};

function topKSampling(
	tokenizer: PreTrainedTokenizer,
	logits: number[],
	k: number,
	temperature: number
): { probabilities: Probabilities; sampled: Probability } {
	// Trim the list to a reasonable number that can be displayed on the screen
	const max = 50;
	const sortedLogits = Array.from(logits)
		.map((logit, index) => ({
			tokenId: index,
			logit
		}))
		.sort((a, b) => b.logit - a.logit)
		.slice(0, max);

	// Temperature Scaling
	const scaledLogits = sortedLogits.map((item) => ({
		...item,
		scaledLogit: item.logit / temperature
	}));

	// Apply Top-k: Keep topK logits and set others to -Infinity
	const filteredLogits = scaledLogits.map((item, index) => ({
		...item,
		topKLogit: index < k ? item.scaledLogit : -Infinity
	}));

	// Softmax Normalization
	const topKLogits = filteredLogits.map((item) => item.topKLogit);
	const { expLogits, probabilities } = softmax(topKLogits);

	const output = filteredLogits.map((item, i) => ({
		...item,
		rank: i,
		token: formatTokenForDisplay(tokenizer.decode([item.tokenId])),
		expLogit: expLogits[i],
		probability: probabilities[i]
	}));

	// Sample from the top-k tokens
	const sampled = randomChoice(output);

	return { probabilities: output, sampled };
}

function topPSampling(
	tokenizer: PreTrainedTokenizer,
	logits: number[],
	p: number,
	temperature: number
): { probabilities: Probabilities; sampled: Probability } {
	// Trim the list to a reasonable number that can be displayed on the screen
	const max = 50;
	const sortedLogits = Array.from(logits)
		.map((logit, index) => ({
			tokenId: index,
			logit
		}))
		.sort((a, b) => b.logit - a.logit)
		.slice(0, max);

	// Temperature Scaling
	const scaledLogits = sortedLogits.map((item) => ({
		...item,
		scaledLogit: item.logit / temperature
	}));

	// Softmax Normalization
	const { expLogits, probabilities } = softmax(scaledLogits.map((item) => item.scaledLogit));

	// Compute cumulative probabilities
	const cumulativeProbabilities: number[] = [];
	probabilities.reduce((acc, prob, idx) => {
		cumulativeProbabilities[idx] = acc + prob;
		return cumulativeProbabilities[idx];
	}, 0);

	let cutoffIndex = cumulativeProbabilities.findIndex((cumProb) => cumProb >= p);
	cutoffIndex = cutoffIndex === -1 ? cumulativeProbabilities.length - 1 : cutoffIndex;

	const topIndices = scaledLogits.slice(0, cutoffIndex + 1);
	const topProbabilities = topIndices.map((d, i) => probabilities[i]);

	// Renormalize probabilities for top-p tokens
	const sumTopProbabilities = topProbabilities.reduce((sum, val) => sum + val, 0);
	const newProbabilities = topProbabilities.map((val) => val / sumTopProbabilities);

	// Sample from the top-p tokens
	const output = scaledLogits.map((item, i) => ({
		...item,
		rank: i,
		token: formatTokenForDisplay(tokenizer.decode([item.tokenId])),
		expLogit: expLogits[i],
		probability: newProbabilities[i] || 0,
		topPProbability: probabilities[i], //original
		cumulativeProbability: cumulativeProbabilities[i],
		cutoffIndex
	}));

	const nextToken = randomChoice(output);
	return { probabilities: output, sampled: nextToken };
}

function softmax(logits: number[]): { expLogits: number[]; probabilities: number[] } {
	const maxLogit = Math.max(...logits);
	const expLogits = logits.map((logit) => (logit === -Infinity ? 0 : Math.exp(logit - maxLogit)));
	const sumExpLogits = expLogits.reduce((sum, val) => sum + val, 0);
	const probabilities = expLogits.map((val) => val / sumExpLogits);

	return { expLogits, probabilities };
}

// Helper function to format tokens for display
function formatTokenForDisplay(token: string): string {
	// Replace special whitespace characters with readable labels
	return token
		.replace(/\n/g, '[NEWLINE]')
		.replace(/\t/g, '[TAB]')
		.replace(/\r/g, '[CR]')
		.replace(/\s{2,}/g, (match) => `[${match.length} SPACES]`); // Multiple spaces
}

// Simulates the np.random.choice function in Python.
function randomChoice(items: Probabilities): Probability {
	const probabilities = items.map((d) => d.probability);

	// Ensure probabilities sum to 1
	// const totalProb = probabilities.reduce((sum, p) => sum + p, 0);
	// if (Math.abs(totalProb - 1.0) > 1e-6) {
	// 	throw new Error('Probabilities must sum to 1.');
	// }

	// Generate a random number between 0 and 1
	const random = Math.random();

	// Accumulate probabilities and find the corresponding item
	let cumulativeProbability = 0;
	for (let i = 0; i < probabilities.length; i++) {
		cumulativeProbability += probabilities[i];
		if (random < cumulativeProbability) {
			return items[i];
		}
	}

	// Fallback in case of numerical issues
	return items[items.length - 1];
}
