<script lang="ts">
	import { t, type RichTextKey } from './index';

	export let message: RichTextKey;
</script>

<!-- Only bundled translation keys are accepted, with no user HTML or interpolated values. -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html $t(message)}
