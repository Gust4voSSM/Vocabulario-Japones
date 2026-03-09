import { loadWidgetsManifest } from "./manifest.js";
import {
  mountComparacaoSlots,
  mountEmbedSlots,
  mountTableSlots,
  mountVerbeteSlots,
} from "./slots.js";
import { hydrateVocabTable } from "./vocab-table.js";
import { hydrateKanjiComparacao, hydrateKanjiVerbete } from "./kanji-widgets.js";
import { hydrateAnkiEmbed } from "./anki-embed.js";
import { bindKanjiReferenceNavigation } from "./navigation.js";
import { initThemeToggle } from "./theme-toggle.js";

export function initAnkiEmbeds() {
  return loadWidgetsManifest().then(function (manifest) {
    mountTableSlots(manifest.tables || {});
    mountEmbedSlots(manifest.embeds || {});
    mountVerbeteSlots(manifest.verbetes || {});
    mountComparacaoSlots(manifest.comparacoes || {});
    document.querySelectorAll("vocab-table[data-vocab-slot]").forEach(function (tableRoot) {
      hydrateVocabTable(tableRoot, manifest.tables || {});
    });
    document
      .querySelectorAll("anki-embed[data-cards-b64], .anki-embed[data-cards-b64]")
      .forEach(hydrateAnkiEmbed);
    document.querySelectorAll("kanji-verbete[data-verbete-slot]").forEach(function (verbeteRoot) {
      hydrateKanjiVerbete(verbeteRoot, manifest.verbetes || {});
    });
    document.querySelectorAll("kanji-comparacao[data-comparacao-slot]").forEach(function (comparacaoRoot) {
      hydrateKanjiComparacao(comparacaoRoot, manifest.comparacoes || {});
    });
  });
}

window.initAnkiEmbeds = initAnkiEmbeds;
bindKanjiReferenceNavigation();
initThemeToggle();

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    function () {
      window.initAnkiEmbeds();
    },
    { once: true },
  );
} else {
  window.initAnkiEmbeds();
}
