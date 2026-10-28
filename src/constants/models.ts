import chinese from './models/gpt2-zh.json';

export const models = {
	'gpt2-zh': {
		label: 'GPT-2 · 中文',
		layer_num: chinese.layer_num,
		attention_head_num: chinese.attention_head_num,
		dimension: chinese.dimension,
		vocab_size: chinese.vocab_size,
		wordPiece: true,
		endTokenIds: [102],
		manifest: 'model-v2/manifest.json',
		tokenizer: chinese.tokenizer,
		prompts: chinese.prompts
	}
} as const;

export type ModelId = keyof typeof models;
export const DEFAULT_MODEL: ModelId = 'gpt2-zh';
export const maxInputTokens = 32;
