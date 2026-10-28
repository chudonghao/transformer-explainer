<script>
	import { t } from '~/i18n';
	import RichText from '~/i18n/RichText.svelte';
	import tailwindConfig from '../../../tailwind.config';
	import resolveConfig from 'tailwindcss/resolveConfig';
	import Katex from '~/utils/Katex.svelte';
</script>

<div id="description">
	<div class="article-section" data-click="article-intro">
		<h1>{$t('article.intro.title')}</h1>

		<p><RichText message="article.intro.architecture" /></p>
		<p><RichText message="article.intro.nextTokenPrediction" /></p>
		<p><RichText message="article.intro.chineseModel" /></p>
	</div>

	<div class="article-section" data-click="article-overview">
		<h1>{$t('article.overview.title')}</h1>

		<p><RichText message="article.overview.introduction" /></p>
		<ol>
			<li><RichText message="article.overview.embedding" /></li>
			<li>
				<RichText message="article.overview.block" />
				<ul class="">
					<li><RichText message="article.overview.attention" /></li>
					<li><RichText message="article.overview.mlp" /></li>
				</ul>
			</li>
			<li><RichText message="article.overview.probabilities" /></li>
		</ol>
	</div>

	<div class="article-section" id="embedding" data-click="article-embedding">
		<h2>{$t('article.embedding.title')}</h2>
		<p><RichText message="article.embedding.introduction" /></p>
		<div class="figure">
			<img alt={$t('article.figure.embedding')} src="./article_assets/embedding.png" width="65%" />
		</div>
		<div class="figure-caption"><RichText message="article.embedding.figureCaption" /></div>
		<div class="article-subsection">
			<h3>{$t('article.embedding.tokenization.title')}</h3>
			<p><RichText message="article.embedding.chineseTokenization" /></p>
		</div>
		<div class="article-subsection" id="article-token-embedding">
			<h3>{$t('article.embedding.tokenEmbedding.title')}</h3>
			<p><RichText message="article.embedding.chineseTokenEmbedding" /></p>
		</div>
		<div class="article-subsection" id="article-positional-embedding">
			<h3>{$t('article.embedding.positionalEncoding.title')}</h3>
			<p>{$t('article.embedding.positionalEncoding.description')}</p>

			<!-- <div class="article-subsection-l2">
	<h4>Alternative Positional Encoding Approach <strong class='attention'>[POTENTIALLY COLLAPSIBLE]</strong></h4>
	<p>
	  Other models, like the original Transformer and BERT,
	  use sinusoidal functions for positional encoding.

	  This sinusoidal encoding is deterministic and designed to reflect
	  the absolute as well as the relative position of each token.
	</p>
	<p>
	  Each position in a sequence is assigned a unique mathematical
	  representation using a combination of sine and cosine functions.

	  For a given position, the sine function represents even dimensions,
	  and the cosine function represents odd dimensions within the positional encoding vector.

	  This periodic nature ensures that each position has a consistent encoding,
	  independent of the surrounding context.
	</p>

	<p>
	  Here’s how it works:
	</p>

	<span class='attention'>
	  SINUSOIDAL POSITIONAL ENCODING EQUATION
	</span>

	<ul>
	  <li>
		<strong>Sine Function</strong>: Used for even indices of the embedding vector.
	  </li>
	  <li>
		<strong>Cosine Function</strong>: Used for odd indices of the embedding vector.
	</ul>

	<p>
	  Hover over individual encoding values in the matrix above to
	  see how it's calculated using the sins and cosine functions.
	</p>
  </div> -->
		</div>
		<div class="article-subsection">
			<h3>{$t('article.embedding.finalEmbedding.title')}</h3>
			<p>{$t('article.embedding.finalEmbedding.description')}</p>
		</div>
	</div>

	<div class="article-section" data-click="article-transformer-block">
		<h2>{$t('article.blocks.title')}</h2>

		<p><RichText message="article.blocks.description" /></p>
	</div>

	<div class="article-section" id="self-attention" data-click="article-attention">
		<h3>{$t('article.attention.title')}</h3>
		<p>{$t('article.attention.overview')}</p>
		<div class="article-subsection-l2">
			<h4>{$t('article.attention.qkv.title')}</h4>

			<div class="figure pt-10">
				<img alt={$t('article.figure.qkv')} src="./article_assets/QKV.png" width="80%" />
				<div class="text-xs">
					<Katex
						displayMode
						math={`
		QKV_{ij} = ( \\sum_{d=1}^{768} \\text{Embedding}_{i,d} \\cdot \\text{Weights}_{d,j}) + \\text{Bias}_j
		`}
					/>
				</div>
			</div>
			<div class="figure-caption"><RichText message="article.attention.qkv.figureCaption" /></div>

			<p><RichText message="article.attention.qkv.projection" /></p>
			<ul>
				<li><RichText message="article.attention.qkv.query" /></li>
				<li><RichText message="article.attention.qkv.key" /></li>
				<li><RichText message="article.attention.qkv.value" /></li>
			</ul>
			<p>{$t('article.attention.qkv.attentionScores')}</p>
		</div>
		<div class="article-subsection-l2">
			<h4>{$t('article.attention.heads.title')}</h4>
			<p><RichText message="article.attention.heads.description" /></p>
		</div>
		<div class="article-subsection-l2">
			<h4>{$t('article.attention.maskedAttention.title')}</h4>
			<p>{$t('article.attention.maskedAttention.description')}</p>

			<div class="figure">
				<img
					alt={$t('article.figure.attention')}
					src="./article_assets/attention.png"
					width="80%"
					align="middle"
				/>
			</div>
			<div class="figure-caption">
				<RichText message="article.attention.maskedAttention.figureCaption" />
			</div>

			<ul>
				<li><RichText message="article.attention.maskedAttention.dotProduct" /></li>
				<li><RichText message="article.attention.maskedAttention.scalingMask" /></li>
				<li><RichText message="article.attention.maskedAttention.softmaxDropout" /></li>
			</ul>
		</div>
		<div class="article-subsection-l2">
			<h4>{$t('article.attention.output.title')}</h4>
			<p><RichText message="article.attention.output.description" /></p>
		</div>
	</div>

	<div class="article-section" id="article-activation" data-click="article-mlp">
		<h3>{$t('article.mlp.title')}</h3>

		<div class="figure">
			<img
				alt={$t('article.figure.mlp')}
				src="./article_assets/mlp.png"
				width="70%"
				align="middle"
			/>
		</div>
		<div class="figure-caption"><RichText message="article.mlp.figureCaption" /></div>

		<p><RichText message="article.mlp.overview" /></p>
		<p><RichText message="article.mlp.expansion" /></p>
		<p><RichText message="article.mlp.compression" /></p>
		<p>{$t('article.mlp.tokenIndependence')}</p>
	</div>

	<div class="article-section" id="article-prob" data-click="article-prob">
		<h2>{$t('article.probabilities.title')}</h2>
		<p><RichText message="article.probabilities.chineseProjection" /></p>

		<div class="figure py-5">
			<img alt={$t('article.figure.softmax')} src="./article_assets/softmax.png" width="70%" />
		</div>
		<div class="figure-caption"><RichText message="article.probabilities.figureCaption" /></div>

		<p id="article-temperature" data-click="article-temperature">
			<RichText message="article.temperature.scaling" />
		</p>

		<ul>
			<li><RichText message="article.temperature.neutral" /></li>
			<li><RichText message="article.temperature.low" /></li>
			<li><RichText message="article.temperature.high" /></li>
		</ul>

		<p id="article-sampling" data-click="article-sampling">
			<RichText message="article.sampling.introduction" />
		</p>
		<ul>
			<li><RichText message="article.sampling.topK" /></li>
			<li><RichText message="article.sampling.topP" /></li>
		</ul>
		<p><RichText message="article.probabilities.samplingBalance" /></p>
	</div>

	<div class="article-section" data-click="article-advanced-features">
		<h2>{$t('article.auxiliary.title')}</h2>

		<p>{$t('article.auxiliary.introduction')}</p>
		<div class="article-subsection" id="article-ln">
			<h3>{$t('article.auxiliary.layerNorm.title')}</h3>

			<p>{$t('article.auxiliary.layerNorm.description')}</p>
		</div>
		<div class="article-subsection" id="article-dropout">
			<h3>{$t('article.auxiliary.dropout.title')}</h3>

			<p>{$t('article.auxiliary.dropout.description')}</p>
		</div>
		<div class="article-subsection" id="article-residual">
			<h3>{$t('article.auxiliary.residual.title')}</h3>

			<p>{$t('article.auxiliary.residual.description')}</p>
		</div>
	</div>

	<div class="article-section" data-click="article-interactive-features">
		<h1>{$t('article.interactive.title')}</h1>
		<p>{$t('article.interactive.introduction')}</p>

		<ul>
			<li><RichText message="article.interactive.input" /></li>
			<li><RichText message="article.interactive.temperature" /></li>
			<li><RichText message="article.interactive.sampling" /></li>
			<li><RichText message="article.interactive.attention" /></li>
		</ul>
	</div>

	<div class="article-section" data-click="article-video">
		<h2>{$t('article.video.title')}</h2>
		<div class="video-container">
			<iframe
				title={$t('ui.videoTutorial')}
				src="https://www.youtube.com/embed/ECR4oAwocjs"
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowfullscreen
			>
			</iframe>
		</div>
	</div>

	<div class="article-section" data-click="article-implementation">
		<h2>{$t('article.implementation.title')}</h2>
		<p><RichText message="article.implementation.architecture" /></p>
	</div>

	<div class="article-section" data-click="article-credit">
		<h2>{$t('article.credit.title')}</h2>
		<p><RichText message="article.credit.contributors" /></p>
	</div>
</div>

<style lang="scss">
	#description :global(a) {
		color: theme('colors.blue.500');

		&:hover {
			color: theme('colors.blue.700');
		}
	}

	#description :global(.bold-purple) {
		color: theme('colors.purple.700');
		font-weight: bold;
	}

	#description :global(code) {
		color: theme('colors.gray.500');
		background-color: theme('colors.gray.50');
		font-family: theme('fontFamily.mono');
	}

	#description :global(.q-color) {
		color: theme('colors.blue.400');
	}

	#description :global(.k-color) {
		color: theme('colors.red.400');
	}

	#description :global(.v-color) {
		color: theme('colors.green.400');
	}

	#description :global(.purple-color) {
		color: theme('colors.purple.500');
	}

	.article-section {
		padding-bottom: 2rem;
	}
	.architecture-section {
		padding-top: 1rem;
	}
	.video-container {
		position: relative;
		padding-bottom: 56.25%; /* 16:9 aspect ratio */
		height: 0;
		overflow: hidden;
		max-width: 100%;
		background: #000;
	}

	.video-container iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	#description {
		padding-bottom: 3rem;
		margin-left: auto;
		margin-right: auto;
		max-width: 78ch;
	}

	#description h1 {
		color: theme('colors.purple.700');
		font-size: 2.2rem;
		font-weight: 300;
		padding-top: 1rem;
	}

	#description h2 {
		// color: #444;
		color: theme('colors.purple.700');
		font-size: 2rem;
		font-weight: 300;
		padding-top: 1rem;
	}

	#description h3 {
		color: theme('colors.gray.700');
		font-size: 1.6rem;
		font-weight: 200;
		padding-top: 1rem;
	}

	#description h4 {
		color: theme('colors.gray.700');
		font-size: 1.6rem;
		font-weight: 200;
		padding-top: 1rem;
	}

	#description p {
		margin: 1rem 0;
	}

	#description p img {
		vertical-align: middle;
	}

	#description .figure-caption {
		font-size: 0.8rem;
		margin-top: 0.5rem;
		text-align: center;
		margin-bottom: 2rem;
	}

	#description ol {
		margin-left: 3rem;
		list-style-type: decimal;
	}

	#description li {
		margin: 0.6rem 0;
	}

	#description p,
	#description div,
	#description li {
		color: theme('colors.gray.600');
		line-height: 1.6;
	}

	#description small {
		font-size: 0.8rem;
	}

	#description ol li img {
		vertical-align: middle;
	}

	#description .video-link {
		color: theme('colors.blue.600');
		cursor: pointer;
		font-weight: normal;
		text-decoration: none;
	}

	#description ul {
		list-style-type: disc;
		margin-left: 2.5rem;
		margin-bottom: 1rem;
	}

	#description :global(a:hover),
	#description .video-link:hover {
		text-decoration: underline;
	}

	.figure,
	.video {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
</style>
