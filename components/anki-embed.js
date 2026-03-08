export function hydrateAnkiEmbed(root) {
  if (root.dataset.initialized === "1") {
    return;
  }
  root.dataset.initialized = "1";

  var firstPassNoShuffle = root.getAttribute("data-first-pass-no-shuffle") === "1";
  var isCustomTag = root.tagName.toLowerCase() === "anki-embed";
  var embedRoot = root;

  if (isCustomTag) {
    root.classList.add("anki-embed-group");
    if (!root.querySelector(".anki-embed")) {
      var shuffleDisabledAttrCustom = firstPassNoShuffle ? " disabled" : "";
      var globalDeckHref = root.getAttribute("data-global-deck-href") || "";
      var localDeckHref = root.getAttribute("data-local-deck-href") || "";
      var exportHtml = "";
      if (globalDeckHref || localDeckHref) {
        exportHtml = '<div class="anki-export-controls">'
          + (globalDeckHref ? '<a href="' + globalDeckHref + '" class="deck-download deck-primary" download>Adicionar ao deck</a>' : "")
          + (localDeckHref ? '<a href="' + localDeckHref + '" class="deck-download deck-secondary" download>Exportar só este bloco</a>' : "")
          + "</div>";
      }
      root.innerHTML = ""
        + '<div class="anki-embed">'
        + '  <div class="anki-card" data-face="front"></div>'
        + '  <div class="anki-controls">'
        + '    <button type="button" class="icon-only" data-action="prev" title="Anterior" aria-label="Anterior"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>'
        + '    <button type="button" class="icon-only flip-toggle" data-action="flip" title="Virar" aria-label="Virar"><i class="fa-regular fa-eye" aria-hidden="true"></i><i class="fa-solid fa-eye" aria-hidden="true"></i></button>'
        + '    <button type="button" class="icon-only" data-action="next" title="Próxima" aria-label="Próxima"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>'
        + '    <button type="button" class="icon-only" data-action="shuffle" title="Embaralhar" aria-label="Embaralhar"' + shuffleDisabledAttrCustom + '><i class="fa-solid fa-shuffle" aria-hidden="true"></i></button>'
        + "  </div>"
        + "</div>"
        + exportHtml;
    }
    embedRoot = root.querySelector(".anki-embed");
  } else {
    root.classList.add("anki-embed");
    if (!root.querySelector(".anki-card")) {
      var shuffleDisabledAttr = firstPassNoShuffle ? " disabled" : "";
      root.innerHTML = ""
        + '<div class="anki-card" data-face="front"></div>'
        + '<div class="anki-controls">'
        + '  <button type="button" class="icon-only" data-action="prev" title="Anterior" aria-label="Anterior"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>'
        + '  <button type="button" class="icon-only flip-toggle" data-action="flip" title="Virar" aria-label="Virar"><i class="fa-regular fa-eye" aria-hidden="true"></i><i class="fa-solid fa-eye" aria-hidden="true"></i></button>'
        + '  <button type="button" class="icon-only" data-action="next" title="Próxima" aria-label="Próxima"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>'
        + '  <button type="button" class="icon-only" data-action="shuffle" title="Embaralhar" aria-label="Embaralhar"' + shuffleDisabledAttr + '><i class="fa-solid fa-shuffle" aria-hidden="true"></i></button>'
        + "</div>";
    }
  }

  if (!embedRoot) {
    return;
  }

  var cardEl = embedRoot.querySelector(".anki-card");
  var raw = root.getAttribute("data-cards-b64") || "";
  var cards = [];
  try {
    var bin = atob(raw);
    var bytes = Uint8Array.from(bin, function (char) {
      return char.charCodeAt(0);
    });
    var decoded = new TextDecoder("utf-8").decode(bytes);
    cards = JSON.parse(decoded);
  } catch (_error) {
    cardEl.innerHTML = "<em>Erro ao carregar cards</em>";
    return;
  }

  var index = 0;
  var isFront = true;
  var seenFront = {};
  var canShuffle = !firstPassNoShuffle;
  var prevBtn = embedRoot.querySelector('[data-action="prev"]');
  var nextBtn = embedRoot.querySelector('[data-action="next"]');
  var shuffleBtn = embedRoot.querySelector('[data-action="shuffle"]');

  function frontHtml(card) {
    return '<div class="card"><div class="furigana-output">' + card.furigana + "</div></div>";
  }

  function backHtml(card) {
    return '<div class="card"><div class="furigana-output">' + card.furigana + '</div><hr id="answer"><div class="muted">' + card.romaji + '</div><div class="meaning">' + card.meaning + "</div></div>";
  }

  function lockCardHeight() {
    if (!cards.length) {
      return;
    }

    var probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.left = "-9999px";
    probe.style.top = "0";

    var width = cardEl.getBoundingClientRect().width || embedRoot.getBoundingClientRect().width;
    if (width) {
      probe.style.width = width + "px";
    }

    embedRoot.appendChild(probe);
    var maxHeight = 0;

    cards.forEach(function (card) {
      probe.innerHTML = frontHtml(card);
      maxHeight = Math.max(maxHeight, probe.offsetHeight);

      probe.innerHTML = backHtml(card);
      maxHeight = Math.max(maxHeight, probe.offsetHeight);
    });

    embedRoot.removeChild(probe);
    if (maxHeight > 0) {
      var locked = Math.ceil(maxHeight);
      cardEl.style.minHeight = locked + "px";
      cardEl.style.height = locked + "px";
      var ratioRaw = getComputedStyle(cardEl).getPropertyValue("--anki-card-ratio").trim();
      var ratio = parseFloat(ratioRaw);
      if (!Number.isFinite(ratio) || ratio <= 0) {
        ratio = 2;
      }
      var targetWidth = Math.ceil(locked * ratio);
      var maxWidth = Math.floor(embedRoot.getBoundingClientRect().width || targetWidth);
      cardEl.style.width = Math.min(targetWidth, maxWidth) + "px";
    }
  }

  function updateNavState() {
    if (!prevBtn || !nextBtn) {
      return;
    }
    if (canShuffle) {
      prevBtn.disabled = false;
      nextBtn.disabled = false;
      return;
    }
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === cards.length - 1;
  }

  function render() {
    var card = cards[index];
    if (!card) {
      cardEl.innerHTML = "<em>Sem cards</em>";
      return;
    }
    if (firstPassNoShuffle && isFront) {
      seenFront[index] = true;
      if (Object.keys(seenFront).length >= cards.length) {
        canShuffle = true;
        firstPassNoShuffle = false;
        if (shuffleBtn) {
          shuffleBtn.disabled = false;
        }
      }
    }
    updateNavState();
    embedRoot.setAttribute("data-face", isFront ? "front" : "back");
    cardEl.innerHTML = isFront ? frontHtml(card) : backHtml(card);
  }

  function next() {
    if (index < cards.length - 1) {
      index += 1;
    } else if (canShuffle) {
      index = 0;
    }
    isFront = true;
    render();
  }

  function prev() {
    if (index > 0) {
      index -= 1;
    } else if (canShuffle) {
      index = cards.length - 1;
    }
    isFront = true;
    render();
  }

  function flip() {
    isFront = !isFront;
    render();
  }

  function shuffle() {
    if (!canShuffle) {
      return;
    }
    for (var i = cards.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = cards[i];
      cards[i] = cards[j];
      cards[j] = tmp;
    }
    index = 0;
    isFront = true;
    render();
  }

  embedRoot.querySelector('[data-action="next"]').addEventListener("click", next);
  embedRoot.querySelector('[data-action="prev"]').addEventListener("click", prev);
  embedRoot.querySelector('[data-action="flip"]').addEventListener("click", flip);
  if (shuffleBtn) {
    shuffleBtn.disabled = !canShuffle;
    shuffleBtn.addEventListener("click", shuffle);
  }

  lockCardHeight();
  window.addEventListener("resize", function () {
    lockCardHeight();
    render();
  });
  render();
}
