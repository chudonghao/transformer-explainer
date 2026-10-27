# Transformer Explainer: Interactive Learning of Text-Generative Models

Transformer Explainer is an interactive visualization tool designed to help anyone learn how Transformer-based models like GPT work. It runs a live GPT-2 model right in your browser, allowing you to experiment with your own text and observe in real time how internal components and operations of the Transformer work together to predict the next tokens. Try Transformer Explainer at http://poloclub.github.io/transformer-explainer and watch a demo video on YouTube https://youtu.be/TFUc41G2ikY.<br/><br/>
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)
[![arxiv badge](https://img.shields.io/badge/arXiv-2408.04619-red)](https://arxiv.org/abs/2408.04619)

<a href="https://youtu.be/TFUc41G2ikY" target="_blank"><img width="100%" src='https://github.com/user-attachments/assets/0a4d8888-6555-4df5-bc71-77f1299115c3'></a>

## Live Demo

Try this bilingual fork: https://chudonghao.github.io/transformer-explainer/

Original project: https://poloclub.github.io/transformer-explainer/

## Research Paper

[**Transformer Explainer: Learning LLM Transformers with Interactive Visual Explanation and Experimentations**](https://dl.acm.org/doi/pdf/10.1145/3772318.3791725).
Aeree Cho, Grace C. Kim, Alexander Karpekov, Seongmin Lee, Alec Helbling, Benjamin Hoover, Zijie J. Wang, Minsuk Kahng, Duen Horng Chau.
_Proceedings of the 2026 CHI Conference on Human Factors in Computing Systems._

## How to run locally

#### Prerequisites

- Node.js 20.19+, 22.12+, or 24+ (matching the Svelte Vite plugin's supported versions)
- NPM v10 or higher

#### Steps

```bash
git clone https://github.com/chudonghao/transformer-explainer.git
cd transformer-explainer
npm ci
npm run dev
```

Then, on your web browser, access http://localhost:5173.

## Language Support

This fork supports English and Simplified Chinese for the interface, tooltips, all 20 tutorial lessons, and the explanatory article. Use the language selector in the top bar to switch languages. The site follows your browser language on first visit and remembers your choice locally, while preserving the current input, model parameters, and tutorial position.

Original screenshots and the embedded video remain in English, with translated captions and labels. Changing the interface language does not change model prompts, generated tokens, formulas, numerical values, or GPT-2's language capabilities.

For translation resources, adding languages, and validation commands, see the [localization development guide](docs/i18n.md).

## Chinese Examples and Live Generation

Choose **GPT-2 · 中文** in the generation model selector to explore five Chinese examples or enter your own Chinese prompt. Desktop browsers run UER Chinese GPT-2 locally and generate one token at a time, with real attention matrices and prediction scores. English GPT-2 remains available. Model choice is separate from interface language; mobile devices use precomputed examples.

The Chinese model uses a 21,128-token WordPiece vocabulary and compressed linear weights (175 MB download). Input is limited to 32 tokens to keep the visualization readable. See the [model guide](docs/models.md) for sources, conversion, validation, and behavior.

To publish your own copy, follow the [GitHub Pages deployment guide](docs/deployment.md).

## Credits

Transformer Explainer was created by <a href="https://aereeeee.github.io/" target="_blank">Aeree Cho</a>, <a href="https://www.linkedin.com/in/chaeyeonggracekim/" target="_blank">Grace C. Kim</a>, <a href="https://alexkarpekov.com/" target="_blank">Alexander Karpekov</a>, <a href="https://alechelbling.com/" target="_blank">Alec Helbling</a>, <a href="https://zijie.wang/" target="_blank">Jay Wang</a>, <a href="https://seongmin.xyz/" target="_blank">Seongmin Lee</a>, <a href="https://bhoov.com/" target="_blank">Benjamin Hoover</a>, and <a href="https://poloclub.github.io/polochau/" target="_blank">Polo Chau</a> at the Georgia Institute of Technology.

## Citation

```bibTeX
@inproceedings{cho2026transformer,
  title={Transformer Explainer: Learning LLM Transformers with Interactive Visual Explanation and Experimentation},
  author={Cho, Aeree and Kim, Grace C and Karpekov, Alexander and Lee, Seongmin and Helbling, Alec and Hoover, Benjamin and Wang, Zijie J and Kahng, Minsuk and Chau, Duen Horng},
  booktitle={Proceedings of the 2026 CHI Conference on Human Factors in Computing Systems},
  pages={1--21},
  year={2026}
}
```

## License

The software is available under the [MIT License](https://github.com/poloclub/transformer-explainer/blob/main/LICENSE).

## Contact

If you have any questions, feel free to [open an issue](https://github.com/poloclub/transformer-explainer/issues/new/choose) or contact [Aeree Cho](https://aereeeee.github.io/) or any of the contributors listed above.

## More AI explainers to check out

- [**Diffusion Explainer**](https://poloclub.github.io/diffusion-explainer) for learning how Stable Diffusion transforms text prompt into image
- [**CNN Explainer**](https://poloclub.github.io/cnn-explainer)
- [**GAN Lab**](https://poloclub.github.io/ganlab) for playing with Generative Adversarial Networks in browser
