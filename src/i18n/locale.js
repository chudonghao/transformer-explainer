import { writable } from 'svelte/store';

export const supportedLocales = /** @type {const} */ ([
	{ code: 'en', label: 'English', browserLanguage: /^en(?:-|$)/i },
	{ code: 'zh-CN', label: '简体中文', browserLanguage: /^zh(?:-|$)/i }
]);

/** @typedef {(typeof supportedLocales)[number]['code']} Locale */

/** @type {Locale} */
export const DEFAULT_LOCALE = 'en';

export const STORAGE_KEY = 'transformer-explainer.locale';

// The default also renders on the server, keeping hydration deterministic.
/** @type {import('svelte/store').Writable<Locale>} */
export const locale = writable(DEFAULT_LOCALE);

/** @param {unknown} value @returns {value is Locale} */
export function isLocale(value) {
	return supportedLocales.some(({ code }) => code === value);
}

/**
 * An explicit choice wins; otherwise use the first supported browser language.
 * @param {unknown} saved
 * @param {readonly string[]} languages
 * @returns {Locale}
 */
export function resolveLocale(saved, languages = []) {
	if (isLocale(saved)) return saved;
	for (const language of languages) {
		const match = supportedLocales.find(({ browserLanguage }) => browserLanguage.test(language));
		if (match) return match.code;
	}
	return DEFAULT_LOCALE;
}

export function initializeLocale() {
	let saved = null;
	try {
		saved = localStorage.getItem(STORAGE_KEY);
	} catch {
		// Private browsing or a storage policy must not prevent language switching.
	}
	locale.set(resolveLocale(saved, navigator.languages));
}

/** @param {string} value */
export function changeLocale(value) {
	if (!isLocale(value)) return;
	locale.set(value);
	try {
		localStorage.setItem(STORAGE_KEY, value);
	} catch {
		// The in-memory preference remains usable when storage is unavailable.
	}
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
