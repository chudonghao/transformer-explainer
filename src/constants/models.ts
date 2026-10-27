import chinese from './models/gpt2-zh.json';

export const models = {
	gpt2: {
		label: 'GPT-2 · English',
		layer_num: 12,
		attention_head_num: 12,
		dimension: 768,
		vocab_size: 50257,
		wordPiece: false,
		endTokenIds: [50256],
		manifest: null,
		chunks: Array.from({ length: 63 }, (_, i) => `model-v2/gpt2.onnx.part${i}`),
		prompts: [
			'Data visualization empowers users to',
			'Artificial Intelligence is transforming the',
			'As the spaceship was approaching the',
			'On the deserted planet they discovered a',
			'IEEE VIS conference highlights the'
		]
	},
	'gpt2-zh': {
		label: 'GPT-2 · 中文',
		layer_num: chinese.layer_num,
		attention_head_num: chinese.attention_head_num,
		dimension: chinese.dimension,
		vocab_size: chinese.vocab_size,
		wordPiece: true,
		endTokenIds: [102],
		manifest: 'models/gpt2-zh/manifest.json',
		chunks: [] as string[],
		prompts: chinese.prompts
	}
} as const;

export type ModelId = keyof typeof models;
export const maxInputTokens = 32;
