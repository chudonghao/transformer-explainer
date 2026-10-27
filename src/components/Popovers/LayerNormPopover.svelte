<script lang="ts">
	import { t } from '~/i18n';
	import type { PopoverProps } from 'flowbite-svelte/Popover.svelte';
	import CommonPopover from './CommonPopover.svelte';

	export let offset: PopoverProps['offset'] = undefined;
	export let className: PopoverProps['class'] = undefined;
	export let triggeredBy: PopoverProps['triggeredBy'] = undefined;
	export let trigger: PopoverProps['trigger'] = undefined;
	export let placement: PopoverProps['placement'] = undefined;
</script>

<CommonPopover
	className="ln-popover"
	title={$t('ui.layerNorm')}
	{offset}
	{triggeredBy}
	{trigger}
	{placement}
	goTo="article-ln"
>
	<div class="ln-content">
		{$t('ui.layerNormDescription')}
	</div></CommonPopover
>

<style lang="scss">
	.ln-content {
		width: 12rem;
	}
</style>
