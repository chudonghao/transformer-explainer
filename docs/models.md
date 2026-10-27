# Browser models and Chinese generation

The generation model is independent of the interface language. On a new page load, the initial model follows the interface language. Changing the language afterwards preserves the current model and prompt; changing the model loads its tokenizer, examples, and weights and resets the prompt to its first example.

| Model             | Tokenizer      | Layers / heads / embedding | Vocabulary | Model download |
| ----------------- | -------------- | -------------------------- | ---------- | -------------- |
| English GPT-2     | Byte-level BPE | 12 / 12 / 768              | 50,257     | 657 MB         |
| UER Chinese GPT-2 | BERT WordPiece | 12 / 12 / 768              | 21,128     | 175 MB         |

Choose **GPT-2 · 中文** for Chinese prompts. Each click on **Generate / 生成** predicts one more token. Input is limited to 32 tokens to keep the attention visualization readable. Chinese characters usually occupy individual tokens; token count is not a word or character count. The Chinese model is a pretrained continuation model, so its output is not equivalent to a modern chat assistant.

Desktop browsers download only the selected model and run it locally with ONNX Runtime Web (WASM). Tokenizers, model chunks, and cached examples are served from this site. The WASM runtime is loaded from jsDelivr. Successful model chunks are cached when browser storage is available; storage failures fall back to downloading. Switching models cancels downloads and releases the old inference session. Updated Chinese chunks use their SHA-256 hash in the cache URL.

Mobile devices retain the upstream example-only mode. While a model downloads, the examples also remain available. Five Chinese examples contain precomputed outputs from the **same quantized model** used for live generation. Temperature and sampling probabilities are recalculated in the browser. The 720 attention matrices (12 layers × 12 heads × 5 stages) and final logits are model outputs; illustrative vector graphics retain the upstream schematic rendering.

## Sources and conversion

- Chinese checkpoint and tokenizer: [uer/gpt2-chinese-cluecorpussmall](https://huggingface.co/uer/gpt2-chinese-cluecorpussmall), revision `c2c0249d8a2731f269414cc3b22dff021f8e07a3`.
- Original checkpoint SHA-256: `5478b950f53650c82f7f7e91010787c870813a76adeabe23c8571b01af1379b4`.
- Model authors and training details: [UER-py](https://github.com/dbiir/UER-py) and the [model card](https://huggingface.co/uer/gpt2-chinese-cluecorpussmall/blob/main/README.md). The training corpus is CLUECorpusSmall.
- English weights: the upstream Transformer Explainer `static/model-v2/` export. English tokenizer files are from [Xenova/gpt2](https://huggingface.co/Xenova/gpt2).

The Chinese export preserves the checkpoint's `gelu_new` activation and uses its tokenizer without adding `[CLS]` or `[SEP]` around a prompt. Dynamic INT8 quantization applies to constant linear MatMul weights; embeddings and attention computations remain floating point. Consequently, the deployed model can differ slightly from the original floating-point checkpoint. The manifest records the conversion revision, chunk hashes, and numerical validation results. Refer to the original model providers for their model terms; the application's MIT license does not assign a new license to third-party weights.

## Rebuild the Chinese assets

Ordinary site builds use the committed assets and need only Node.js. Re-exporting the model additionally needs Python 3.12 and the pinned conversion dependencies:

```bash
python3 -m venv /tmp/transformer-model-env
/tmp/transformer-model-env/bin/pip install -r scripts/requirements-model.txt
```

Download `config.json`, `pytorch_model.bin`, `vocab.txt`, `tokenizer_config.json`, and `special_tokens_map.json` from the pinned source revision into `/tmp/uer-gpt2-source`. For example:

```bash
/tmp/transformer-model-env/bin/python - <<'PY'
from huggingface_hub import snapshot_download
snapshot_download(
    'uer/gpt2-chinese-cluecorpussmall',
    revision='c2c0249d8a2731f269414cc3b22dff021f8e07a3',
    local_dir='/tmp/uer-gpt2-source',
    allow_patterns=['config.json', 'pytorch_model.bin', 'vocab.txt',
                    'tokenizer_config.json', 'special_tokens_map.json'],
)
PY
/tmp/transformer-model-env/bin/python scripts/prepare_chinese_model.py \
  --source /tmp/uer-gpt2-source --work-dir /tmp/uer-gpt2-export
npm test
npm run build
```

The exporter validates PyTorch logits against Hugging Face, quantizes the ONNX export, checks all attention stages, compares the top ten candidates on nine prompts, and generates examples, tokenizer files, 10 MiB chunks, and `static/models/gpt2-zh/manifest.json`. Large intermediate checkpoints stay outside the repository. Edit `src/constants/models/gpt2-zh.json` and rerun the exporter when changing the bundled prompts.
