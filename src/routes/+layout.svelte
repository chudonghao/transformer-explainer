<script lang="ts">
	import { initializeLocale, locale, t } from '~/i18n';
	import '~/styles/app.css';
	import '~/styles/global.scss';
	import Topbar from '~/components/Topbar.svelte';
	import { isLoaded, predictedColor, rootRem, userId } from '~/store';
	import Article from '~/components/article/Article.svelte';
	import { onMount } from 'svelte';
	import { Spinner } from 'flowbite-svelte';
	import Alert from '~/components/Alert.svelte';
	import GTM from '~/utils/gtm.svelte';
	import { page } from '$app/stores';

	let topBarHeight = 0;
	let scrollLeft = 0;

	let minScreenWidth = 1300;
	let minColumWidth = Math.floor(minScreenWidth / 24) - rootRem * 2;

	let intersectionObserver: IntersectionObserver;
	let tobBarActive = false;
	let target: HTMLElement;

	onMount(() => {
		initializeLocale();
		const unsubscribeLocale = locale.subscribe((value) => {
			document.documentElement.lang = value;
		});
		isLoaded.set(true);

		const userIdParam = $page.url.searchParams.get('userId');

		if (userIdParam) {
			userId.set(userIdParam);
			(window as any).dataLayer?.push({
				event: 'user_identified',
				user_id: userIdParam,
				timestamp: new Date().toISOString()
			});
		}

		intersectionObserver = new IntersectionObserver(handleIntersection, {
			root: null,
			rootMargin: '0px',
			threshold: 0.2
		});

		if (target) {
			intersectionObserver.observe(target);
		}
		window.addEventListener('scroll', handleMobileScrollX);

		return () => {
			unsubscribeLocale();
			intersectionObserver.disconnect();
			window.removeEventListener('scroll', handleMobileScrollX);
		};
	});

	function handleIntersection(entries: any[]) {
		entries.forEach((entry: any) => {
			if (entry.isIntersecting) {
				tobBarActive = true;
			} else {
				tobBarActive = false;
			}
		});
	}

	const handleMobileScrollX = () => {
		scrollLeft = window.scrollX || document.documentElement.scrollLeft;
	};
</script>

<svelte:head>
	<title>{$t('ui.pageTitle')}</title>
	<meta name="title" content={$t('ui.pageTitle')} />
	<meta name="description" content={$t('ui.pageDescription')} />
	<meta property="og:title" content={$t('ui.pageTitle')} />
	<meta property="og:description" content={$t('ui.pageDescription')} />
	<meta property="twitter:title" content={$t('ui.pageTitle')} />
	<meta property="twitter:description" content={$t('ui.pageDescription')} />
</svelte:head>

<GTM />
<div
	id="app"
	style={`--min-screen-width:${minScreenWidth}px;--min-column-width:${minColumWidth}px;--predicted-color:${predictedColor};`}
>
	<div id="landing">
		<header bind:offsetHeight={topBarHeight} style="transform: translateX({-1 * scrollLeft}px);">
			<Topbar isActive={tobBarActive} />
		</header>
		<main id="main" style={`padding-top:${topBarHeight}px`} bind:this={target}>
			{#if $isLoaded}
				<slot />
			{:else}
				<div class="flex h-full w-full items-center justify-center"><Spinner color="purple" /></div>
			{/if}
		</main>
	</div>
	<div class="article h-auto w-full">
		<Article></Article>
	</div>
</div>

<!-- <div class="alert">
	<Alert />
</div> -->

<style lang="scss">
	.alert {
		position: fixed;
		bottom: 1rem;
		left: 1rem;
		z-index: 9999;
	}

	#app {
		height: 100vh;
		min-width: 900px;
	}

	#landing {
		height: 100%;
		width: 100%;
		min-width: var(--min-screen-width);
	}

	header {
		min-width: 900px;
		width: 100%;
		position: fixed;
		z-index: $TOP_BAR_INDEX;
	}
	main {
		position: relative;
		height: 95%;
		width: 100%;
		display: flex;
		justify-content: start;
		overflow: hidden;
	}
	.article {
		padding-top: 2rem;
	}
</style>
