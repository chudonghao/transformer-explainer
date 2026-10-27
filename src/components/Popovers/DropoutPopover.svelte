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
	className="dropout-popover"
	title={$t('ui.dropout')}
	{offset}
	{triggeredBy}
	{trigger}
	{placement}
	goTo="article-dropout"
>
	<div class="dropout-content">
		{$t('ui.dropoutDescription')}
	</div></CommonPopover
>

<style lang="scss">
	.dropout-content {
		width: 12rem;
	}
</style>
