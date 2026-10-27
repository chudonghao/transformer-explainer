<script lang="ts">
	import { t, type RichTextKey } from './index';
	import { selectedModel } from '~/store';

	export let message: RichTextKey;

	const chineseModelMessages: Partial<Record<RichTextKey, RichTextKey>> = {
		'tutorial.token-embedding.content': 'tutorial.token-embedding-chinese.content',
		'tutorial.output-logit.content': 'tutorial.output-logit-chinese.content',
		'article.intro.gpt2': 'article.intro.chineseModel',
		'article.embedding.tokenization.description': 'article.embedding.chineseTokenization',
		'article.embedding.tokenEmbedding.description': 'article.embedding.chineseTokenEmbedding',
		'article.probabilities.projection': 'article.probabilities.chineseProjection'
	};
	$: resolvedMessage =
		$selectedModel === 'gpt2-zh' ? (chineseModelMessages[message] ?? message) : message;
</script>

<!-- Only bundled translation keys are accepted, with no user HTML or interpolated values.
     tests/i18n.test.mjs validates their elements, attributes, and link protocols. -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html $t(resolvedMessage)}
