/** @param {import('@xenova/transformers').PreTrainedTokenizer} tokenizer @param {string} text */
export function encodeInput(tokenizer, text) {
	return tokenizer.encode(text, null, { add_special_tokens: false });
}

/**
 * Keep WordPiece boundaries visible; concatenating decoded Chinese characters
 * otherwise introduces spaces that were not present in the original prompt.
 * @param {import('@xenova/transformers').PreTrainedTokenizer} tokenizer
 * @param {number[]} ids
 * @param {boolean} wordPiece
 */
export function tokenLabels(tokenizer, ids, wordPiece) {
	return ids.map((id) => (wordPiece ? tokenizer.model.vocab[id] : tokenizer.decode([id])));
}

/**
 * Append the actual token, not its visualization label (e.g. [NEWLINE]).
 * WordPiece continuations join the preceding word; new Latin words need a space.
 * @param {import('@xenova/transformers').PreTrainedTokenizer} tokenizer
 * @param {string} text
 * @param {number} tokenId
 * @param {boolean} wordPiece
 */
export function appendToken(tokenizer, text, tokenId, wordPiece) {
	if (!wordPiece) return text + tokenizer.decode([tokenId]);
	const token = tokenizer.model.vocab[tokenId];
	if (token.startsWith('##')) return text + token.slice(2);
	const separator = /[a-z0-9]$/i.test(text) && /^[a-z0-9]/i.test(token) ? ' ' : '';
	return text + separator + token;
}
