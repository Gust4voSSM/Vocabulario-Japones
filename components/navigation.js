function extractKanjiIdFromHref(href) {
  if (!href || !href.startsWith("#/")) {
    return "";
  }
  var query = href.split("?")[1] || "";
  var params = new URLSearchParams(query);
  return params.get("id") || "";
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

function scrollToKanjiHeading(kanjiId) {
  if (!kanjiId) {
    return false;
  }

  var verbete = document.querySelector('.markdown-section kanji-verbete[data-kanji-id="' + kanjiId + '"]');
  if (verbete) {
    verbete.scrollIntoView({ behavior: "smooth", block: "start" });
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

function scrollToKanjiWithRetry(kanjiId, retriesLeft) {
  if (!kanjiId) {
    return;
  }
  if (scrollToKanjiHeading(kanjiId)) {
    return;
  }
  if (retriesLeft <= 0) {
    return;
  }
  setTimeout(function () {
    scrollToKanjiWithRetry(kanjiId, retriesLeft - 1);
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
    var kanjiId = extractKanjiIdFromHref(href);
    if (!kanjiId) {
      return;
    }
    event.preventDefault();

    if (window.location.hash !== href) {
      pushReturnPoint();
      window.location.hash = href;
      scrollToKanjiWithRetry(kanjiId, 12);
      return;
    }
    scrollToKanjiWithRetry(kanjiId, 12);
  });

  window.addEventListener("hashchange", function () {
    if (tryRestoreReturnPoint(window.location.hash || "")) {
      return;
    }
    var kanjiId = extractKanjiIdFromHref(window.location.hash || "");
    if (!kanjiId) {
      return;
    }
    scrollToKanjiWithRetry(kanjiId, 12);
  });

  var initialKanjiId = extractKanjiIdFromHref(window.location.hash || "");
  if (initialKanjiId) {
    scrollToKanjiWithRetry(initialKanjiId, 12);
  }
}
