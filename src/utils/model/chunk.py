"""Split an ONNX file into browser chunks and return their manifest metadata."""

import argparse
import hashlib
import json
from pathlib import Path

CHUNK_SIZE = 10 * 1024 * 1024


def split_file(source, destination, chunk_size=CHUNK_SIZE):
    if chunk_size <= 0:
        raise ValueError("Chunk size must be positive")
    source = Path(source)
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    chunks = []
    with source.open("rb") as stream:
        while data := stream.read(chunk_size):
            filename = f"{source.name}.part{len(chunks)}"
            (destination / filename).write_bytes(data)
            chunks.append({"file": filename, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    return chunks


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    print(json.dumps(split_file(args.source, args.destination), indent=2))


if __name__ == "__main__":
    main()
