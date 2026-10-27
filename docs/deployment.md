# GitHub Pages deployment

This fork is configured for the project URL:

<https://chudonghao.github.io/transformer-explainer/>

The production base path is `/transformer-explainer` in `svelte.config.js`. Model and tokenizer requests include this prefix. Keep the repository name and base path aligned if moving the project.

## Publish

From the source branch:

```bash
npm ci
npm test
npm run build
npm run preview
# Check http://localhost:4173/transformer-explainer/ before publishing.
npm run deploy
```

`deploy` publishes only `build/` to the `gh-pages` branch and adds `.nojekyll`. In the repository's **Settings → Pages**, select **Deploy from a branch**, branch **gh-pages**, folder **/ (root)**, and save. This setting is only needed once. Wait for GitHub's Pages deployment to finish before checking the public URL. Publishing does not require merging the feature branch into `main`.

The complete site is approximately 878 MB, including both model variants. Model chunks are at most 10 MiB each. Keep the final deployment below the [GitHub Pages published-site limit](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). The browser downloads the selected model only, but repeated uncached downloads count toward Pages bandwidth usage.

For an ordinary static web server, copy the contents of `build/` into a directory mounted at `/transformer-explainer/`. No Node.js inference server or API key is needed. To use another path, change `kit.paths.base`, rebuild, and mount the new build at that path.
