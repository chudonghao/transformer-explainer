<script lang="ts">
	import { changeLocale, locale, supportedLocales, t } from '~/i18n';
</script>

<label class="language-switcher">
	<span class="sr-only">{$t('ui.language')}</span>
	<select value={$locale} on:change={(event) => changeLocale(event.currentTarget.value)}>
		{#each supportedLocales as { code, label } (code)}
			<option value={code} lang={code}>{label}</option>
		{/each}
	</select>
</label>

<style lang="scss">
	.language-switcher {
		flex-shrink: 0;
	}
	select {
		border: 1px solid theme('colors.gray.300');
		border-radius: 0.5rem;
		background-color: theme('colors.white');
		color: theme('colors.gray.700');
		font-size: 0.85rem;
		padding: 0.45rem 1.75rem 0.45rem 0.6rem;
		cursor: pointer;
	}
	select:focus-visible {
		outline: 2px solid theme('colors.violet.600');
		outline-offset: 2px;
	}
</style>
