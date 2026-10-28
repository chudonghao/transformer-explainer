<script lang="ts">
	import { locale, supportedLocales, t } from '~/i18n';
	import { siteConfig } from '~/constants/site.js';

	let dialog: HTMLDialogElement;

	function selectLanguage(event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		if (select.value === 'en') {
			select.value = $locale;
			dialog.showModal();
		}
	}
</script>

<label class="language-switcher">
	<span class="sr-only">{$t('ui.language')}</span>
	<select value={$locale} on:change={selectLanguage}>
		{#each supportedLocales as { code, label } (code)}
			<option value={code} lang={code}>{label}</option>
		{/each}
	</select>
</label>

<dialog
	bind:this={dialog}
	aria-labelledby="english-site-title"
	aria-describedby="english-site-body"
>
	<h2 id="english-site-title">{$t('ui.englishSiteTitle')}</h2>
	<div id="english-site-body">
		<p>{$t('ui.englishSiteDescription')}</p>
		<p lang="en">The English version is hosted on the original website. Continue there?</p>
	</div>
	<div class="dialog-actions">
		<form method="dialog">
			<button type="submit">{$t('ui.cancel')} / <span lang="en">Cancel</span></button>
		</form>
		<a href={siteConfig.englishSiteUrl} data-sveltekit-reload>
			{$t('ui.visitEnglishSite')} / <span lang="en">Continue</span>
		</a>
	</div>
</dialog>

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
	dialog {
		margin: auto;
		width: min(30rem, calc(100vw - 2rem));
		max-height: calc(100vh - 2rem);
		overflow-y: auto;
		padding: 1.5rem;
		border: 1px solid theme('colors.gray.200');
		border-radius: 0.75rem;
		background: white;
		color: theme('colors.gray.800');
		box-shadow: 0 1rem 3rem rgb(0 0 0 / 15%);
	}
	dialog::backdrop {
		background: rgb(0 0 0 / 35%);
	}
	h2 {
		margin-bottom: 1rem;
		font-size: 1.1rem;
		font-weight: 600;
	}
	p {
		margin: 0.5rem 0;
		font-size: 0.9rem;
		line-height: 1.6;
	}
	.dialog-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}
	button,
	a {
		display: inline-block;
		border: 1px solid theme('colors.gray.300');
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.85rem;
	}
	button:hover {
		background: theme('colors.gray.100');
	}
	a {
		background: theme('colors.violet.600');
		border-color: theme('colors.violet.600');
		color: white;
	}
	a:hover {
		background: theme('colors.violet.700');
	}
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid theme('colors.violet.600');
		outline-offset: 2px;
	}
</style>
