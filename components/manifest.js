function emptyManifest() {
  return { embeds: {}, tables: {}, verbetes: {}, comparacoes: {} };
}

export function normalizeWidgetsManifest(rawManifest) {
  if (!rawManifest || typeof rawManifest !== "object") {
    return emptyManifest();
  }
  if (rawManifest.embeds || rawManifest.tables || rawManifest.verbetes || rawManifest.comparacoes) {
    return {
      embeds: rawManifest.embeds || {},
      tables: rawManifest.tables || {},
      verbetes: rawManifest.verbetes || {},
      comparacoes: rawManifest.comparacoes || {},
    };
  }
  return { embeds: rawManifest, tables: {}, verbetes: {}, comparacoes: {} };
}

export function loadWidgetsManifest() {
  if (!window.__ankiWidgetsManifestPromise) {
    window.__ankiWidgetsManifestPromise = fetch("data/embeds-manifest.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          return emptyManifest();
        }
        return response.json();
      })
      .then(normalizeWidgetsManifest)
      .catch(function () {
        return emptyManifest();
      });
  }
  return window.__ankiWidgetsManifestPromise;
}
