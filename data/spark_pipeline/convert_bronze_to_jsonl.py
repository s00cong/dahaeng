#!/usr/bin/env python3
"""Convert bronze crawler JSONL files into consolidated JSONL per source.

Usage examples:
  python convert_bronze_to_jsonl.py --source google_flight --outdir data/normalized --sample 50
  python convert_bronze_to_jsonl.py --all --outdir data/normalized
"""
from pathlib import Path
import argparse
import json
import sys


def iter_jsonl(path: Path):
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except Exception:
                continue


def process_source(source_name: str, bronze_root: Path, out_path: Path, sample: int | None = None) -> int:
    bronze_root = Path(bronze_root)
    files = sorted(bronze_root.rglob("*.jsonl"))
    if not files:
        print(f"No jsonl files found for {source_name} under {bronze_root}", file=sys.stderr)
        return 0

    out_path.parent.mkdir(parents=True, exist_ok=True)
    written = 0
    with out_path.open("w", encoding="utf-8") as out:
        for p in files:
            for rec in iter_jsonl(p):
                if "source" not in rec:
                    rec["source"] = source_name
                out.write(json.dumps(rec, ensure_ascii=False) + "\n")
                written += 1
                if sample and written >= sample:
                    return written

    return written


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert bronze crawler JSONL into consolidated JSONL per source")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--source", choices=["google_flight", "trip_com"], help="Single source to process")
    group.add_argument("--all", action="store_true", help="Process all supported sources")
    parser.add_argument("--outdir", default="data/normalized", help="Output directory for consolidated JSONL files")
    parser.add_argument("--sample", type=int, default=0, help="If >0, stop after writing this many records per run (useful for testing)")
    args = parser.parse_args()

    mapping = {
        "google_flight": Path("data/google_flight/bronze_airticket"),
        "trip_com": Path("data/trip_com/bronze_airticket"),
    }

    targets = [args.source] if args.source else list(mapping.keys())
    outdir = Path(args.outdir)

    total = 0
    for s in targets:
        in_root = mapping.get(s)
        if in_root is None:
            print(f"Unknown source: {s}", file=sys.stderr)
            continue
        out_path = outdir / f"{s}.jsonl"
        n = process_source(s, in_root, out_path, sample=(args.sample or None))
        print(f"Wrote {n} records for {s} -> {out_path}")
        total += n

    print(f"Total written: {total}")


if __name__ == "__main__":
    main()
