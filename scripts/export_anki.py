#!/usr/bin/env python3
import argparse
import hashlib
import json
from pathlib import Path

import genanki

def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").lstrip("\ufeff")


def stable_id(seed: str) -> int:
    # Anki recomenda IDs estáveis para model/deck para que updates funcionem corretamente.
    return int(hashlib.sha1(seed.encode("utf-8")).hexdigest()[:10], 16)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))

    front_tpl = read_text(root / "assets" / "anki" / "front.html")
    back_tpl = read_text(root / "assets" / "anki" / "back.html")
    css_tpl = read_text(root / "assets" / "anki" / "style.css")
    model_id = stable_id("SiteJapones Note|" + front_tpl + "|" + back_tpl + "|" + css_tpl)

    model = genanki.Model(
        model_id,
        "SiteJapones Note",
        fields=[
            {"name": "Japones"},
            {"name": "Romaji"},
            {"name": "Portugues"},
        ],
        templates=[
            {
                "name": "Card 1",
                "qfmt": front_tpl,
                "afmt": back_tpl,
            }
        ],
        css=css_tpl,
    )

    deck_id = stable_id(payload["deck_name"])
    deck = genanki.Deck(deck_id, payload["deck_name"])

    for card in payload.get("cards", []):
        note = genanki.Note(
            model=model,
            fields=[
                str(card.get("Japones", "")),
                str(card.get("Romaji", "")),
                str(card.get("Portugues", "")),
            ],
        )
        deck.add_note(note)

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    genanki.Package(deck).write_to_file(str(output))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
