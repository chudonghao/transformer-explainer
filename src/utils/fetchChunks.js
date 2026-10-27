const CACHE_NAME = 'onnx-model-cache-v2';

/**
 * Keep successful chunks when a download is interrupted. Cache failures (private
 * browsing, storage quotas) must not prevent inference from downloaded bytes.
 * @param {string[]} urls
 * @param {{signal?: AbortSignal, onProgress?: (loaded: number, total: number) => void}} options
 */
export async function fetchAndMergeChunks(urls, { signal, onProgress } = {}) {
	/** @type {Cache | undefined} */
	let cache;
	try {
		cache = typeof caches === 'undefined' ? undefined : await caches.open(CACHE_NAME);
	} catch {
		// Download without persistent caching when browser storage is unavailable.
	}
	/** @type {ArrayBuffer[]} */
	const chunks = new Array(urls.length);
	const controller = new AbortController();
	const cancel = () => controller.abort();
	if (signal?.aborted) cancel();
	signal?.addEventListener('abort', cancel, { once: true });
	let next = 0;
	let loaded = 0;
	let hasCache = false;
	const throwIfAborted = () => {
		if (controller.signal.aborted) throw new DOMException('Model download cancelled', 'AbortError');
	};
	const download = async () => {
		while (next < urls.length) {
			throwIfAborted();
			const index = next++;
			const url = urls[index];
			let response;
			try {
				response = await cache?.match(url);
			} catch {
				// A cache read failure should fall back to the network.
			}
			if (response?.ok) {
				hasCache = true;
			} else {
				response = await fetch(url, { signal: controller.signal });
				if (!response.ok) throw new Error(`Model download failed (${response.status}): ${url}`);
				try {
					await cache?.put(url, response.clone());
				} catch {
					// Continue with this response even if there is no room in the cache.
				}
			}
			chunks[index] = await response.arrayBuffer();
			throwIfAborted();
			onProgress?.(++loaded, urls.length);
		}
	};
	const downloads = Array.from({ length: Math.min(6, urls.length) }, download);
	try {
		await Promise.all(downloads);
	} catch (error) {
		cancel();
		await Promise.allSettled(downloads);
		throw error;
	} finally {
		signal?.removeEventListener('abort', cancel);
	}
	throwIfAborted();
	const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
	const mergedArray = new Uint8Array(totalSize);
	let offset = 0;
	for (let index = 0; index < chunks.length; index++) {
		const chunk = chunks[index];
		mergedArray.set(new Uint8Array(chunk), offset);
		offset += chunk.byteLength;
		delete chunks[index];
	}
	return { hasCache, mergedArray: mergedArray.buffer };
}
