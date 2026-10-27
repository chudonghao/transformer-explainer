"""Quantize constant linear weights, preserving floating-point attention outputs."""

import argparse
from pathlib import Path

from onnxruntime.quantization import QuantType, quantize_dynamic


def quantize_model(source, destination):
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    quantize_dynamic(
        source, destination, weight_type=QuantType.QInt8, per_channel=True,
        op_types_to_quantize=["MatMul"], extra_options={"MatMulConstBOnly": True},
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    quantize_model(args.source, args.destination)


if __name__ == "__main__":
    main()
