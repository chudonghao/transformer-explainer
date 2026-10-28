import { writable } from 'svelte/store';

export const supportedLocales = /** @type {const} */ ([
	{ code: 'zh-CN', label: '简体中文' },
	{ code: 'en', label: 'English' }
]);

/** @typedef {(typeof supportedLocales)[number]['code']} Locale */

/** @type {Locale} */
export const DEFAULT_LOCALE = 'zh-CN';

// The default also renders on the server, keeping hydration deterministic.
/** @type {import('svelte/store').Writable<Locale>} */
export const locale = writable(DEFAULT_LOCALE);

export function initializeLocale() {
	// This deployment is Chinese-only. Ignore browser language and preferences
	// saved by the bilingual version; English requires an explicit external link.
	locale.set(DEFAULT_LOCALE);
}

/**
 * Replace named parameters without interpreting their contents as HTML.
 * @param {string} message
 * @param {Record<string, string | number>} [parameters]
 */
export function interpolate(message, parameters = {}) {
	return message.replace(/\{(\w+)\}/g, (match, name) =>
		Object.hasOwn(parameters, name) ? String(parameters[name]) : match
	);
}
