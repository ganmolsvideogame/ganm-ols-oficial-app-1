from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any

from .catalog_intelligence import analyze_catalog
from .models import ProductInput


def _load_json(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as file:
        payload = json.load(file)

    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        products = payload.get("products", [])
        if isinstance(products, list):
            return [item for item in products if isinstance(item, dict)]
    raise ValueError("JSON precisa ser uma lista de produtos ou conter a chave 'products'.")


def _load_csv(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def load_products(path: Path) -> list[ProductInput]:
    suffix = path.suffix.lower()
    if suffix == ".json":
        rows = _load_json(path)
    elif suffix == ".csv":
        rows = _load_csv(path)
    else:
        raise ValueError("Formato nao suportado. Use .json ou .csv.")

    return [ProductInput.from_mapping(row) for row in rows]


def write_report(report: dict[str, Any], output: Path | None) -> None:
    payload = json.dumps(report, ensure_ascii=False, indent=2)
    if output is None:
        print(payload)
        return

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(payload + "\n", encoding="utf-8")
    print(f"Relatorio salvo em: {output}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="ganm-ai")
    subparsers = parser.add_subparsers(dest="command", required=True)

    catalog = subparsers.add_parser("catalog", help="Audita catalogo de produtos.")
    catalog.add_argument("--input", required=True, help="Arquivo JSON ou CSV de produtos.")
    catalog.add_argument("--output", help="Caminho opcional para salvar o relatorio JSON.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "catalog":
        products = load_products(Path(args.input))
        report = analyze_catalog(products)
        write_report(report, Path(args.output) if args.output else None)
        return 0

    parser.error("Comando invalido.")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
