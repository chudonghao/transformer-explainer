"""Export UER GPT-2, validate its outputs, and generate browser assets.

Run with the dependencies in requirements.txt. The source directory must
contain the original Hugging Face checkpoint, config, and tokenizer files.
"""

import argparse
import gc
import hashlib
import json
from pathlib import Path
import subprocess

import numpy as np
import onnxruntime as ort
import torch
from transformers import BertTokenizerFast, GPT2LMHeadModel

from chunk import split_file
from export_to_onnx import STAGES, VisualizationModel, export_model, output_names
from model import GPT, GPTConfig
from quantize import quantize_model

ROOT = Path(__file__).resolve().parents[3]
DEFINITION = json.loads((ROOT / "src/constants/models/gpt2-zh.json").read_text(encoding="utf8"))
MODEL_ID = DEFINITION["source"]
REVISION = DEFINITION["revision"]
PROMPTS = DEFINITION["prompts"]


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, allow_nan=False, separators=(",", ":")) + "\n",
        encoding="utf8",
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--work-dir", type=Path, required=True)
    args = parser.parse_args()
    args.work_dir.mkdir(parents=True, exist_ok=True)
    torch.set_num_threads(4)
    torch.manual_seed(0)

    with (args.source / "pytorch_model.bin").open("rb") as checkpoint:
        source_hash = hashlib.file_digest(checkpoint, "sha256").hexdigest()
    assert source_hash == DEFINITION["checkpoint_sha256"], "Checkpoint does not match the pinned source revision"

    reference = GPT2LMHeadModel.from_pretrained(
        args.source, local_files_only=True, use_safetensors=False, attn_implementation="eager"
    ).eval()
    config = reference.config
    assert (config.n_layer, config.n_head, config.n_embd, config.vocab_size) == (12, 12, 768, 21128)
    assert config.activation_function == "gelu_new"
    tokenizer = BertTokenizerFast.from_pretrained(args.source, local_files_only=True)
    browser_tokenizer = BertTokenizerFast.from_pretrained(
        DEFINITION["tokenizer"]["source"], revision=DEFINITION["tokenizer"]["revision"]
    )
    assert json.loads(tokenizer.backend_tokenizer.to_str()) == json.loads(
        browser_tokenizer.backend_tokenizer.to_str()
    ), "Browser tokenizer does not match the source checkpoint"

    model = GPT(GPTConfig(
        vocab_size=config.vocab_size, block_size=config.n_positions,
        n_layer=config.n_layer, n_head=config.n_head, n_embd=config.n_embd,
        dropout=0, activation_function=config.activation_function,
    )).eval()
    state = model.state_dict()
    source_state = reference.state_dict()
    transposed = ("attn.c_attn.weight", "attn.c_proj.weight", "mlp.c_fc.weight", "mlp.c_proj.weight")
    expected = {key for key in state if not key.endswith(".attn.bias")}
    assert expected == set(source_state), "Checkpoint keys do not match the visualization model"
    with torch.no_grad():
        for key in expected:
            value = source_state[key].t() if key.endswith(transposed) else source_state[key]
            assert state[key].shape == value.shape, key
            state[key].copy_(value)

    names = output_names(config)
    wrapped = VisualizationModel(model).eval()
    validation_prompts = [*PROMPTS, "你", "你好，世界", "今天的温度是20度", "自然语言处理是一门研究语言和计算机的学科"]
    reference_logits = []
    conversion_errors = []
    with torch.no_grad():
        for prompt in validation_prompts:
            ids = tokenizer.encode(prompt, add_special_tokens=False)
            input_tensor = torch.tensor([ids], dtype=torch.long)
            expected_logits = reference(input_tensor).logits[:, -1:, :].numpy()
            actual_logits = wrapped(input_tensor)[-1].numpy()
            error = float(np.max(np.abs(expected_logits - actual_logits)))
            conversion_errors.append(error)
            np.testing.assert_allclose(actual_logits, expected_logits, atol=0.002, rtol=0.0002)
            reference_logits.append(expected_logits.reshape(-1))
    print("Reference conversion max error:", max(conversion_errors), flush=True)
    del reference, source_state
    gc.collect()

    fp32_path = args.work_dir / "gpt2-zh-fp32.onnx"
    int8_path = args.work_dir / "gpt2-zh-int8.onnx"
    dummy = torch.tensor([tokenizer.encode(PROMPTS[0], add_special_tokens=False)], dtype=torch.long)
    export_model(wrapped, dummy, fp32_path)
    del wrapped, model, state
    gc.collect()
    print("FP32 export bytes:", fp32_path.stat().st_size, flush=True)
    quantize_model(fp32_path, int8_path)
    print("INT8 export bytes:", int8_path.stat().st_size, flush=True)

    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    session = ort.InferenceSession(str(int8_path), sess_options=options, providers=["CPUExecutionProvider"])
    assert [item.name for item in session.get_outputs()] == names
    report = []
    for index, (prompt, expected_logits) in enumerate(zip(validation_prompts, reference_logits)):
        ids = tokenizer.encode(prompt, add_special_tokens=False)
        values = session.run(None, {"input": np.array([ids], dtype=np.int64)})
        logits = values[-1].reshape(-1)
        assert logits.shape == (config.vocab_size,) and np.all(np.isfinite(logits))
        for offset in range(0, len(names) - 1, len(STAGES)):
            raw, scaled, masked, softmax, dropout = values[offset:offset + len(STAGES)]
            assert raw.shape == (1, len(ids), len(ids))
            np.testing.assert_allclose(scaled, raw / 8, rtol=1e-5, atol=1e-5)
            assert np.all(np.isneginf(masked[0][np.triu_indices(len(ids), 1)]))
            np.testing.assert_allclose(softmax.sum(axis=-1), 1, atol=1e-5)
            np.testing.assert_allclose(dropout, softmax, atol=1e-6)
        expected_top = set(np.argsort(expected_logits)[-10:].tolist())
        actual_top = set(np.argsort(logits)[-10:].tolist())
        overlap = len(expected_top & actual_top)
        assert overlap >= 6, f"Quantization changed too many top candidates for {prompt}: {overlap}/10"
        entry = {
            "prompt": prompt, "tokenIds": ids, "top10Overlap": overlap,
            "maxLogitError": float(np.max(np.abs(logits - expected_logits))),
            "nextTokens": [tokenizer.decode([int(token)]) for token in np.argsort(logits)[-5:][::-1]],
        }
        report.append(entry)
        print(json.dumps(entry, ensure_ascii=False), flush=True)
        if index < len(PROMPTS):
            # JSON represents masked -Infinity with null, as in the upstream examples.
            outputs = {
                name: {"data": [[float(value) if np.isfinite(value) else None for value in row] for row in matrix[0]]}
                for name, matrix in zip(names[:-1], values[:-1])
            }
            example = {
                "prompt": prompt, "tokens": tokenizer.convert_ids_to_tokens(ids), "tokenIds": ids,
                "logits": logits.tolist(), "outputs": outputs,
            }
            subprocess.run(
                ["node", str(Path(__file__).with_name("write_example.mjs")), str(index)],
                input=json.dumps(example, ensure_ascii=False, allow_nan=False),
                encoding="utf8", cwd=ROOT, check=True,
            )

    subprocess.run(
        ["npx", "--no-install", "prettier", "--write", "src/constants/examples/"],
        cwd=ROOT, check=True,
    )

    destination = ROOT / "static/model-v2"
    chunks = split_file(int8_path, destination)
    manifest = {
        "source": MODEL_ID, "revision": REVISION, "format": "onnx", "quantization": "int8-linear-weights",
        "checkpoint_sha256": source_hash,
        "layer_num": config.n_layer, "attention_head_num": config.n_head,
        "dimension": config.n_embd, "vocab_size": config.vocab_size,
        "bytes": int8_path.stat().st_size, "chunks": chunks, "prompts": PROMPTS,
        "validation": {"referenceMaxError": max(conversion_errors), "cases": report},
    }
    write_json(destination / "manifest.json", manifest)
    print("Browser assets and manifest written", flush=True)


if __name__ == "__main__":
    main()
