import { derived } from 'svelte/store';
import en from './messages/en.json';
import zhCN from './messages/zh-CN.json';
import { interpolate, locale, type Locale } from './locale.js';

export { changeLocale, initializeLocale, locale, supportedLocales } from './locale.js';
export type { Locale } from './locale.js';
export type MessageKey = keyof typeof en;
export type RichTextKey = Extract<MessageKey, `article.${string}` | `tutorial.${string}.content`>;
type Parameters = Record<string, string | number>;

const messages: Record<Locale, Partial<Record<MessageKey, string>>> = { en, 'zh-CN': zhCN };

export const t = derived(
	locale,
	($locale) => (key: MessageKey, parameters?: Parameters) =>
		interpolate(messages[$locale][key] ?? en[key], parameters)
);
