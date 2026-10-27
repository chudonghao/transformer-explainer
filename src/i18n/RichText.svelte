<script lang="ts">
	import { t, type RichTextKey } from './index';

	export let message: RichTextKey;
</script>

<!-- Only bundled translation keys are accepted, with no user HTML or interpolated values.
     tests/i18n.test.mjs validates their elements, attributes, and link protocols. -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html $t(message)}
