function parseKanjiNavFromHref(href) {
  if (!href || !href.startsWith("#/")) {
    return { id: "", target: "" };
  }
  var query = href.split("?")[1] || "";
  var params = new URLSearchParams(query);
  return {
    id: params.get("id") || "",
    target: params.get("target") || "",
  };
}

function scrollToKanjiComparacao(kanjiId) {
  if (!kanjiId) {
    return false;
  }
  var comparacao = document.querySelector(
    '.markdown-section kanji-comparacao[data-left-kanji="' + kanjiId + '"], '
    + '.markdown-section kanji-comparacao[data-right-kanji="' + kanjiId + '"]'
  );
  if (!comparacao) {
    return false;
  }
  comparacao.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

function getReturnStack() {
  if (!Array.isArray(window.__kanjiNavReturnStack)) {
    window.__kanjiNavReturnStack = [];
  }
  return window.__kanjiNavReturnStack;
}

function pushReturnPoint() {
  var stack = getReturnStack();
  stack.push({
    hash: window.location.hash || "",
    scrollY: Number(window.scrollY || window.pageYOffset || 0),
  });
}

function tryRestoreReturnPoint(currentHash) {
  var stack = getReturnStack();
  if (stack.length === 0) {
    return false;
  }

  var top = stack[stack.length - 1];
  if (!top || String(top.hash || "") !== String(currentHash || "")) {
    return false;
  }

  stack.pop();
  var targetY = Number(top.scrollY);
  if (!Number.isFinite(targetY)) {
    return false;
  }

  window.scrollTo({ top: Math.max(0, Math.round(targetY)), behavior: "smooth" });
  return true;
}

function scrollToKanjiHeading(kanjiId, target) {
  if (!kanjiId) {
    return false;
  }

  if (target === "comparacao" && scrollToKanjiComparacao(kanjiId)) {
    return true;
  }

  var verbete = document.querySelector('.markdown-section kanji-verbete[data-kanji-id="' + kanjiId + '"]');
  if (verbete) {
    verbete.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  if (scrollToKanjiComparacao(kanjiId)) {
    return true;
  }

  var titles = document.querySelectorAll(".markdown-section .kanji-title");
  for (var i = 0; i < titles.length; i += 1) {
    if ((titles[i].textContent || "").trim() === kanjiId) {
      var heading = titles[i].closest("h1,h2,h3,h4,h5,h6");
      if (heading) {
        heading.scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      }
    }
  }
  return false;
}

function scrollToKanjiWithRetry(kanjiId, target, retriesLeft) {
  if (!kanjiId) {
    return;
  }
  if (scrollToKanjiHeading(kanjiId, target)) {
    return;
  }
  if (retriesLeft <= 0) {
    return;
  }
  setTimeout(function () {
    scrollToKanjiWithRetry(kanjiId, target, retriesLeft - 1);
  }, 120);
}

export function bindKanjiReferenceNavigation() {
  if (window.__kanjiRefClickBound) {
    return;
  }
  window.__kanjiRefClickBound = true;

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a.kanji-ref");
    if (!link) {
      return;
    }
    var href = link.getAttribute("href") || "";
    var nav = parseKanjiNavFromHref(href);
    var kanjiId = nav.id;
    var target = nav.target;
    if (!kanjiId) {
      return;
    }
    event.preventDefault();

    if (window.location.hash !== href) {
      pushReturnPoint();
      window.location.hash = href;
      scrollToKanjiWithRetry(kanjiId, target, 12);
      return;
    }
    scrollToKanjiWithRetry(kanjiId, target, 12);
  });

  window.addEventListener("hashchange", function () {
    if (tryRestoreReturnPoint(window.location.hash || "")) {
      return;
    }
    var nav = parseKanjiNavFromHref(window.location.hash || "");
    var kanjiId = nav.id;
    var target = nav.target;
    if (!kanjiId) {
      return;
    }
    scrollToKanjiWithRetry(kanjiId, target, 12);
  });

  var initialNav = parseKanjiNavFromHref(window.location.hash || "");
  var initialKanjiId = initialNav.id;
  if (initialKanjiId) {
    scrollToKanjiWithRetry(initialKanjiId, initialNav.target, 12);
  }
}
