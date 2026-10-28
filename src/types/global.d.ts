type Flow = {
	type?: 'path' | 'node';
	id: string;
	from?: string;
	to?: string;
	match?: boolean;
	arrow?: boolean;
	anchor?: { from?: 'l' | 'r' | 't' | 'b'; to?: 'l' | 'r' | 't' | 'b' };
	stroke?: { width?: number };
	transition?: gsap.TweenVars & { position?: gsap.Position };
	curve?: 'vh' | 'hv';
};

type MatrixData = number[][];

interface Window {
	dataLayer?: Record<string, unknown>[];
}

type ModelMetaData = {
	layer_num: number;
	attention_head_num: number;
	dimension: number;
	vocab_size: number;
	chunkTotal?: number;
};

type HighlightedToken = {
	index: number | string | null;
	value?: string | null;
	fix?: boolean;
};

type HighlightedHead = {
	index: number | string | null;
	value?: string | null;
	fix?: boolean;
};

type ExpandedBlock = { id: number | string | null };

type Probability = {
	rank: number;
	tokenId: number;
	token: string;
	logit: number;
	scaledLogit: number;
	expLogit: number;
	probability: number;
	topKLogit?: number;
	topPProbability?: number;
	cumulativeProbability?: number;
	cutoffIndex?: number;
};
type Probabilities = Probability[];
type ModelData = {
	logits: number[];
	outputs: Record<string, { data: number[][]; dims?: number[]; size?: number }>;
	probabilities: Probabilities;
	sampled: Probability;
};

type Sampling = { type: 'top-k' | 'top-p'; value: number };

type ModelInput = {
	text: string;
	// Preserve generated token boundaries until the user edits the text.
	tokenIds?: number[];
};

type CachedModelData = Pick<ModelData, 'logits' | 'outputs'> & {
	prompt: string;
	tokens: string[];
	tokenIds: number[];
};
