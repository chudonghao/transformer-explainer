/**
 * JSON encodes masked attention scores as null. Restore -Infinity so cached
 * examples and live inference use the same numeric matrices.
 * @param {Record<string, {data: (number | null)[][], dims?: number[], size?: number}>} outputs
 */
export function restoreMaskedScores(outputs) {
	return Object.fromEntries(
		Object.entries(outputs).map(([name, output]) => [
			name,
			{ ...output, data: output.data.map((row) => row.map((value) => value ?? -Infinity)) }
		])
	);
}
