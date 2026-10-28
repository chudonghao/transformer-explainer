<script lang="ts">
	import { t } from '~/i18n';
	import { Dropdown, DropdownItem, ButtonGroup } from 'flowbite-svelte';
	import Temperature from './Temperature.svelte';

	import { ChevronDownOutline } from 'flowbite-svelte-icons';
	import {
		modelInput,
		isModelRunning,
		predictedToken,
		inputTextExample,
		isFetchingModel,
		expandedBlock,
		selectedExampleIdx,
		isMobile,
		weightPopover,
		sampling,
		attentionHeadIdx,
		blockIdx,
		temperature,
		tokenIds,
		modelTokenizer,
		modelSession,
		modelMeta,
		modelError,
		modelReload,
		modelDownloadProgress,
		isOnBlockTransition,
		userId
	} from '~/store';
	import LoadingDots from './common/LoadingDots.svelte';
	import classNames from 'classnames';
	import Sampling from './Sampling.svelte';
	import { completeCurrentAnimation } from '~/utils/animation';
	import { textPages } from '~/utils/textbookPages';
	import { maxInputTokens } from '~/constants/models';
	import { prepareInput } from '~/utils/tokenization.js';

	let inputRef: HTMLDivElement;
	let predictRef: HTMLDivElement;

	let useCustomInput = false;

	let inputTextTemp = '';
	let inputTokenIdsTemp: number[] | undefined;
	let predictionDismissed = false;
	$: {
		inputTextTemp = $modelInput.text;
		inputTokenIdsTemp = $modelInput.tokenIds;
		predictionDismissed = false;
	}
	$: if (inputRef && inputRef.innerText !== inputTextTemp) inputRef.innerText = inputTextTemp;

	$: predictedTokenTemp = predictionDismissed ? '' : $predictedToken?.token || '';

	$: generationEnded =
		!!predictedTokenTemp &&
		!!$predictedToken &&
		$modelMeta.endTokenIds.some((id) => id === $predictedToken.tokenId);
	$: nextInput = $modelTokenizer
		? prepareInput(
				$modelTokenizer,
				{ text: inputTextTemp, tokenIds: inputTokenIdsTemp },
				predictedTokenTemp && !generationEnded ? $predictedToken?.tokenId : undefined,
				$modelMeta.wordPiece
			)
		: { text: inputTextTemp, tokenIds: [] };
	$: inputTokenCount = nextInput.tokenIds.length;
	$: exceedLimit = inputTokenCount > maxInputTokens;

	// Focusing accepts a prediction without re-tokenizing it; editing invalidates it.
	const onFocusInput = () => {
		if (disabled || generationEnded) return;
		inputTextTemp = nextInput.text;
		inputTokenIdsTemp = nextInput.tokenIds;
		predictionDismissed = true;
		inputRef.innerText = inputTextTemp;
	};

	const onInput = () => {
		inputTextTemp = inputRef.innerText;
		inputTokenIdsTemp = undefined;
		predictionDismissed = true;
		useCustomInput = true;
	};

	const handleSubmit = (e?: Event) => {
		e?.preventDefault();
		if (disabled || exceedLimit || generationEnded || inputTokenCount === 0) return;
		// Complete any running animation before starting new generation
		completeCurrentAnimation();

		setTimeout(() => {
			onFocusInput();
			textPages.find((page) => page.id === 'how-transformers-work')?.complete?.();

			modelInput.set({ text: inputTextTemp, tokenIds: inputTokenIdsTemp });

			window.dataLayer?.push({
				event: 'generate-next-token',
				attn_head_num: $attentionHeadIdx,
				transformer_block_num: $blockIdx,
				sampling_type: $sampling.type,
				sampling_value: $sampling.value,
				temperature_value: $temperature,
				current_token_length: $tokenIds.length,
				input_word_count: inputTextTemp
					.trim()
					.split(/\s+/)
					.filter((word) => word.length > 0).length,
				use_custom_input: useCustomInput,
				user_id: $userId
			});
		}, 0);
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.isComposing || e.keyCode === 229) return;
		if (e.key === 'Enter') {
			e.preventDefault();
			if (disabled || exceedLimit) return;
			handleSubmit(e);
			return;
		}
	};

	// Example select box
	let dropdownOpen = false;
	const onSelectExample = (d: string, i: number) => {
		if ($isFetchingModel) {
			textPages.find((page) => page.id === 'how-transformers-work')?.complete?.();
		}

		dropdownOpen = false;

		selectedExampleIdx.set(i);
		modelInput.set({ text: d });
		useCustomInput = false;
	};

	const moveCursorToEnd = (element: HTMLElement) => {
		const range = document.createRange();
		const sel = window.getSelection();
		if (!sel) return;
		range.selectNodeContents(element);
		range.collapse(false);
		sel.removeAllRanges();
		sel.addRange(range);
		element.focus();
	};

	$: disabled =
		$isFetchingModel ||
		!$modelSession ||
		$isModelRunning ||
		$expandedBlock.id !== null ||
		!!$weightPopover;
	$: selectDisabled =
		$isModelRunning ||
		$isOnBlockTransition ||
		$expandedBlock.id !== null ||
		!!$weightPopover ||
		!$modelTokenizer;
	$: parameterDisabled = !!$weightPopover;
</script>

<div class="input-area" data-click="input-area">
	<form class="input-form" data-click="input-form" on:submit={handleSubmit}>
		<ButtonGroup class="input-btn-group" size="sm">
			<button
				data-click="dropdown-btn"
				type="button"
				disabled={selectDisabled}
				class:selectDisabled
				class="select-button inline-flex shrink-0 items-center justify-center border border-s-0 border-gray-200 bg-white px-3 py-2 text-center text-xs font-medium text-gray-900 first:rounded-s-lg first:border-s last:rounded-e-lg"
			>
				{$t('ui.examples')}<ChevronDownOutline class="pointer-events-none h-4 w-4 text-gray-500" />
			</button>
			<Dropdown bind:open={dropdownOpen} class="example-dropdown">
				{#each $inputTextExample as text, index}
					<DropdownItem
						data-click={`dropdown-item-${index}`}
						class={$selectedExampleIdx === index ? 'active' : undefined}
						on:click={() => {
							onSelectExample(text, index);
						}}>{text}</DropdownItem
					>
				{/each}
			</Dropdown>

			<div
				data-click="text-input"
				class="input-container"
				class:disabled
				role="none"
				on:keydown={(e) => {
					e.stopPropagation();
					inputRef.focus();
				}}
				on:click={(e) => {
					e.stopPropagation();
					inputRef.focus();
				}}
			>
				<div class={`editable ${!$isModelRunning ? 'w-full' : ''}`}>
					<div
						bind:this={inputRef}
						contenteditable={!disabled}
						class="text-box"
						placeholder={$t('ui.inputPlaceholder')}
						aria-label={$t('ui.inputPlaceholder')}
						aria-multiline="false"
						on:focus={onFocusInput}
						on:input={onInput}
						on:keydown={handleKeyDown}
						on:click={(e) => {
							e.stopPropagation();
						}}
						role="textbox"
						tabindex="0"
					></div>
					{#if !$isModelRunning}
						<div
							bind:this={predictRef}
							class="predicted"
							role="none"
							on:click={(e) => {
								e.stopPropagation();
								onFocusInput();
								inputRef.focus();
								moveCursorToEnd(inputRef);
							}}
						>
							<span>{predictedTokenTemp}</span>
						</div>
					{/if}
				</div>
				{#if $isModelRunning}
					<div class="loading"><LoadingDots /></div>
				{/if}
				{#if $modelError}
					<span class="helper-text error" role="alert">
						{$t($modelError)}
						{#if $modelError === 'ui.modelLoadFailed'}
							<button
								type="button"
								class="retry"
								on:click={() => modelReload.update((count) => count + 1)}>{$t('ui.retry')}</button
							>
						{/if}
					</span>
				{:else if $isMobile}
					<span class="helper-text">{$t('ui.desktopRequired')}</span>
				{:else if $isFetchingModel}
					<span class="helper-text" role="status">
						{$modelDownloadProgress.total
							? $t('ui.modelDownloadProgress', $modelDownloadProgress)
							: $t('ui.modelDownloading')}
					</span>
				{:else if exceedLimit}
					<span class="helper-text">{$t('ui.inputTokenLimit', { count: maxInputTokens })}</span>
				{:else if generationEnded}
					<span class="helper-text">{$t('ui.generationEnded')}</span>
				{/if}
			</div>
		</ButtonGroup>
		<button
			data-click="generate-btn"
			disabled={disabled || exceedLimit || generationEnded || inputTokenCount === 0}
			class={classNames('generate-button rounded-lg text-center text-sm shadow-sm', {
				disabled: disabled || exceedLimit || generationEnded || inputTokenCount === 0,
				active: !(disabled || exceedLimit || generationEnded || inputTokenCount === 0)
			})}
			type="submit"
		>
			{$t('ui.generate')}
		</button>
	</form>
	<div class="parameters" data-click="input-parameters">
		<Temperature disabled={parameterDisabled} />
		<Sampling disabled={parameterDisabled} />
	</div>
</div>

<style lang="scss">
	.parameters {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.helper-text.error {
		color: theme('colors.red.700');
	}
	.retry {
		text-decoration: underline;
		margin-left: 0.5rem;
	}

	.input-area {
		width: 100%;
		flex-shrink: 0;
		display: flex;
		gap: 1rem;
		padding-left: 1rem;
		padding-right: 1.25rem;

		.input-form {
			width: 100%;
			flex: 1 0 0;
			display: flex;
			align-items: center;
			gap: 0.5rem;

			:global(.input-btn-group) {
				flex: 1 0 0;
				display: flex;
			}
		}
	}
	.input-container {
		position: relative;
		display: flex;
		flex: 1 0 0;
		align-items: center;

		border: 1px solid theme('colors.gray.300');
		color: theme('colors.gray.900');
		border-left: none;
		border-start-end-radius: 0.5rem;
		border-end-end-radius: 0.5rem;
		font-size: 1rem;
		line-height: 1rem;
		padding: 0.5rem;
		white-space: pre-wrap;
		gap: 0.3rem;

		width: 10px; // to keep input box width

		.editable {
			overflow-y: hidden;
			justify-content: end; // to show the last word

			display: flex;
			align-items: center;
			overflow-x: hidden;
			white-space: nowrap;

			.text-box {
				white-space: nowrap;
				:global(br) {
					display: none;
				}

				&:focus {
					outline: none;
				}
			}
			.predicted {
				flex: 1 0 0;
				color: var(--predicted-color);
				font-weight: 600;
				span {
					white-space: pre;
				}
			}
		}

		&.disabled {
			cursor: not-allowed;
		}

		.loading {
			flex-shrink: 0;
		}
	}

	.select-button {
		flex-shrink: 0;
		font-size: 0.9rem;
		border: 1px solid theme('colors.gray.300');
		color: theme('colors.gray.900');
		&:hover {
			background-color: theme('colors.gray.100');
		}
		&:focus {
			outline: none;
		}
		&.disabled {
			cursor: not-allowed;
		}
	}
	:global(.example-dropdown) {
		:global(.active) {
			background-color: theme('colors.gray.100') !important;
		}
	}
	.helper-text {
		position: absolute;
		bottom: 0;
		left: 0;
		white-space: nowrap;
		padding: 0.3rem 0;
		transform: translate(0, 100%);
		color: theme('colors.gray.400');
		font-size: 0.75rem;
	}
	:global(.generate-button) {
		padding: 0.4rem 0.8rem;
		border: 1px solid theme('colors.gray.300');
		color: theme('colors.gray.900');
		transition: all 0.2s;
		flex-shrink: 0;
	}
	:global(.generate-button.active) {
		&:hover {
			border: 1px solid var(--predicted-color);
			color: var(--predicted-color);
		}
	}
	:global(.generate-button.disabled) {
		opacity: 1;
		background-color: theme('colors.gray.100');
		color: theme('colors.gray.400');
		cursor: not-allowed;
	}

	:global(.generate-button):focus {
		border: 1px solid var(--predicted-color);
		color: var(--predicted-color);
	}
</style>
