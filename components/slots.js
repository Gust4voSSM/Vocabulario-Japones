function eachMarkdownParagraph(visitor) {
  document.querySelectorAll(".markdown-section p").forEach(visitor);
}

export function mountEmbedSlots(embeds) {
  var slotRegex = /^\s*\[\[anki-embed:([a-z0-9_-]+)\]\]\s*$/i;
  eachMarkdownParagraph(function (paragraph) {
    var text = (paragraph.textContent || "").trim();
    var match = text.match(slotRegex);
    if (!match) {
      return;
    }

    var slotId = match[1];
    var slot = embeds[slotId];
    if (!slot || !slot.cardsB64) {
      return;
    }

    var host = document.createElement("anki-embed");
    host.setAttribute("id", slot.id || slotId);
    host.setAttribute("data-cards-b64", slot.cardsB64);
    if (slot.globalDeckHref) {
      host.setAttribute("data-global-deck-href", slot.globalDeckHref);
    }
    if (slot.localDeckHref) {
      host.setAttribute("data-local-deck-href", slot.localDeckHref);
    }
    if (slot.firstPassNoShuffle) {
      host.setAttribute("data-first-pass-no-shuffle", "1");
    }
    paragraph.replaceWith(host);
  });
}

export function mountTableSlots(tables) {
  var slotRegex = /^\s*\[\[vocab-table:([a-z0-9_-]+)\]\]\s*$/i;
  eachMarkdownParagraph(function (paragraph) {
    var text = (paragraph.textContent || "").trim();
    var match = text.match(slotRegex);
    if (!match) {
      return;
    }

    var slotId = match[1];
    var slot = tables[slotId];
    if (!slot || !Array.isArray(slot.rows)) {
      return;
    }

    var host = document.createElement("vocab-table");
    host.setAttribute("data-vocab-slot", slotId);
    paragraph.replaceWith(host);
  });
}

export function mountVerbeteSlots(verbetes) {
  var slotRegex = /^\s*\[\[kanji-verbete:([a-z0-9_-]+)\]\]\s*$/i;
  eachMarkdownParagraph(function (paragraph) {
    var text = (paragraph.textContent || "").trim();
    var match = text.match(slotRegex);
    if (!match) {
      return;
    }

    var slotId = match[1];
    var slot = verbetes[slotId];
    if (!slot) {
      return;
    }

    var host = document.createElement("kanji-verbete");
    host.setAttribute("data-verbete-slot", slotId);
    paragraph.replaceWith(host);
  });
}

export function mountComparacaoSlots(comparacoes) {
  var slotRegex = /^\s*\[\[kanji-comparacao:([a-z0-9_-]+)\]\]\s*$/i;
  eachMarkdownParagraph(function (paragraph) {
    var text = (paragraph.textContent || "").trim();
    var match = text.match(slotRegex);
    if (!match) {
      return;
    }

    var slotId = match[1];
    var slot = comparacoes[slotId];
    if (!slot) {
      return;
    }

    var host = document.createElement("kanji-comparacao");
    host.setAttribute("data-comparacao-slot", slotId);
    paragraph.replaceWith(host);
  });
}
