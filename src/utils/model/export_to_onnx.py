"""Shared visualization outputs and ONNX export for GPT-2 models.

The CLI exports a reference English checkpoint to an explicit output path.
Use prepare_chinese_model.py to rebuild this site's Chinese assets.
"""

import argparse
from pathlib import Path

import torch

STAGES = ("attn", "attn_scaled", "attn_masked", "attn_softmax", "attn_dropout")


class VisualizationModel(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, input):
        result = self.model(input)
        values = [
            result["block"][f"block_{layer}"]["attn"][f"head_{head}"][stage]
            for layer in range(self.model.config.n_layer)
            for head in range(self.model.config.n_head)
            for stage in STAGES
        ]
        return (*values, result["linear"]["output"])


def output_names(config):
    return [
        f"block_{layer}_attn_head_{head}_{stage}"
        for layer in range(config.n_layer)
        for head in range(config.n_head)
        for stage in STAGES
    ] + ["linear_output"]


def export_model(wrapped, input_ids, destination):
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    names = output_names(wrapped.model.config)
    torch.onnx.export(
        wrapped, input_ids, destination, input_names=["input"], output_names=names,
        opset_version=17, do_constant_folding=True,
        dynamic_axes={"input": {1: "tokens"}, **{name: {1: "tokens", 2: "tokens"} for name in names[:-1]}},
        dynamo=False,
    )


def main():
    from model import GPT

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, choices=("gpt2", "gpt2-medium", "gpt2-large", "gpt2-xl"))
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    model = VisualizationModel(GPT.from_pretrained(args.model).eval()).eval()
    input_ids = torch.tensor([[6601, 32704, 795, 30132, 2985, 284]], dtype=torch.long)
    export_model(model, input_ids, args.output)


if __name__ == "__main__":
    main()
